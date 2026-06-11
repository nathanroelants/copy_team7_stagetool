import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
console.log('Logboek routes geladen');

// ─── Auth middleware ───────────────────────────────────────────────────────────

router.get('/test', (req, res) => {
  res.json({ ok: true });
});
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Niet ingelogd' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Ongeldige of verlopen sessie' });
  }
}

function requireStudent(req, res, next) {
  if (req.user.rol !== 'student') {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

function requireDocent(req, res, next) {
  if (req.user.rol !== 'docent') {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

// ─── Helper: verify stage belongs to student ──────────────────────────────────

async function getStageForStudent(supabase, stageId, studentId) {
  const { data, error } = await supabase
    .from('stages')
    .select('id, student_id, start_datum, eind_datum, stagevoorstel:stagevoorstellen!stagevoorstel_id(bedrijfsnaam)')
    .eq('id', stageId)
    .eq('student_id', studentId)
    .single();

  if (error || !data) return null;
  return data;
}

// ─── GET /api/logboek/mijn-stage ──────────────────────────────────────────────
// Haal de actieve stage op voor de ingelogde student

router.get('/mijn-stage', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data: gebruiker, error: gebruikerError } = await supabase
    .from('gebruikers')
    .select('id, voornaam, achternaam')
    .eq('id', req.user.id)
    .single();

  if (gebruikerError || !gebruiker) {
    return res.status(404).json({ error: 'Gebruiker niet gevonden' });
  }

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select(`
      id,
      start_datum,
      eind_datum,
      stagevoorstel:stagevoorstellen!stagevoorstel_id (
        bedrijfsnaam
      )
    `)
    .eq('student_id', req.user.id)
    .order('aangemaakt_op', { ascending: false })
    .limit(1)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Geen actieve stage gevonden' });
  }

  res.json({
    naam: `${gebruiker.voornaam} ${gebruiker.achternaam}`.trim(),
    stageId: stage.id,
    startDatum: stage.start_datum,
    eindDatum: stage.eind_datum,
    bedrijf: stage.stagevoorstel?.bedrijfsnaam ?? '',
  });
});

// ─── GET /api/logboek/:stageId/weken ──────────────────────────────────────────
// Haal alle logboekweken (gegroepeerd) op voor een stage

router.get('/:stageId/weken', requireAuth, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  // Studenten mogen enkel hun eigen stage zien; docenten mogen alles zien
  if (req.user.rol === 'student') {
    const stage = await getStageForStudent(supabase, stageId, req.user.id);
    if (!stage) return res.status(403).json({ error: 'Geen toegang tot deze stage' });
  }

  const { data: logboeken, error } = await supabase
    .from('logboeken')
    .select('*')
    .eq('stage_id', stageId)
    .order('week_nummer', { ascending: true })
    .order('datum_van', { ascending: true });

  if (error) {
    console.error('Fout bij ophalen logboeken:', error);
    return res.status(500).json({ error: 'Kon logboeken niet ophalen' });
  }

  // Groepeer entries per weeknummer
  const wekenMap = {};
  for (const entry of logboeken || []) {
    const wn = entry.week_nummer;
    if (!wekenMap[wn]) {
      wekenMap[wn] = {
        nummer: wn,
        status: entry.status ?? 'aangemaakt',
        afgetekend: entry.afgetekend ?? false,
        entries: [],
      };
    }
    wekenMap[wn].entries.push(entry);
    // Status van de week = meest recente status binnen die week
    wekenMap[wn].status = entry.status ?? wekenMap[wn].status;
    wekenMap[wn].afgetekend = entry.afgetekend ?? wekenMap[wn].afgetekend;
  }

  const weken = Object.values(wekenMap).map(week => {
    const datums = week.entries.map(e => new Date(e.datum_van)).filter(d => !isNaN(d));
    const maandag = datums.length
      ? new Date(Math.min(...datums.map(d => d.getTime())))
      : null;
    const zondag = maandag ? new Date(maandag) : null;
    if (zondag) zondag.setDate(zondag.getDate() + 6);

    return {
      nummer: week.nummer,
      van: maandag ? formatDatum(maandag) : '',
      tot: zondag ? formatDatumVolledig(zondag) : '',
      maxUren: 40,
      status: week.afgetekend ? 'goedgekeurd' : (week.status === 'ingediend' ? 'ingediend' : 'ingediend'),
      open: false,
      entries: week.entries.map(mapEntry),
    };
  });

  res.json(weken);
});

// ─── POST /api/logboek/:stageId/dag ───────────────────────────────────────────
// Voeg een nieuwe dag toe aan het logboek

router.post('/:stageId/dag', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  const stage = await getStageForStudent(supabase, stageId, req.user.id);
  if (!stage) return res.status(403).json({ error: 'Geen toegang tot deze stage' });

  const { datum, taak, uren, los, reflectie, leerpunten } = req.body;

  if (!datum || !taak) {
    return res.status(400).json({ error: 'Datum en taak zijn verplicht' });
  }

  const gekozenDatum = new Date(datum);
  if (isNaN(gekozenDatum.getTime())) {
    return res.status(400).json({ error: 'Ongeldige datum' });
  }

  const weekNummer = berekenWeeknummer(gekozenDatum, new Date(stage.start_datum));

  const { data: inserted, error } = await supabase
    .from('logboeken')
    .insert({
      stage_id: parseInt(stageId, 10),
      week_nummer: weekNummer,
      datum_van: datum,
      taken: taak,
      reflectie: reflectie || null,
      leerpunten: leerpunten || null,
      problemen: los || null,   // LO's opgeslagen in het "problemen" veld — pas aan indien nodig
      uren_gemaakt: uren || 0,
      status: 'aangemaakt',
      afgetekend: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Fout bij opslaan dag:', error);
    return res.status(500).json({ error: 'Kon dag niet opslaan' });
  }

  res.status(201).json(mapEntry(inserted));
});

// ─── PATCH /api/logboek/:stageId/week/:weekNummer/indienen ────────────────────
// Dien een volledige week in (status → ingediend)

router.patch('/:stageId/week/:weekNummer/indienen', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId, weekNummer } = req.params;

  const stage = await getStageForStudent(supabase, stageId, req.user.id);
  if (!stage) return res.status(403).json({ error: 'Geen toegang tot deze stage' });

  const { error } = await supabase
    .from('logboeken')
    .update({ status: 'ingediend' })
    .eq('stage_id', stageId)
    .eq('week_nummer', parseInt(weekNummer, 10));

  if (error) {
    console.error('Fout bij indienen week:', error);
    return res.status(500).json({ error: 'Kon week niet indienen' });
  }

  res.json({ ok: true });
});

// ─── PATCH /api/logboek/:stageId/week/:weekNummer/aftekenen ───────────────────
// Teken een week af (docent only)

router.patch('/:stageId/week/:weekNummer/aftekenen', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId, weekNummer } = req.params;

  const { error } = await supabase
    .from('logboeken')
    .update({
      afgetekend: true,
      afgetekend_op: new Date().toISOString(),
      status: 'goedgekeurd',
    })
    .eq('stage_id', stageId)
    .eq('week_nummer', parseInt(weekNummer, 10));

  if (error) {
    console.error('Fout bij aftekenen week:', error);
    return res.status(500).json({ error: 'Kon week niet aftekenen' });
  }

  res.json({ ok: true });
});

// ─── DELETE /api/logboek/entry/:entryId ───────────────────────────────────────
// Verwijder een logboekregel (enkel eigen entries)

router.delete('/entry/:entryId', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { entryId } = req.params;

  // Verifieer dat de entry bij een stage van de student hoort
  const { data: entry, error: fetchError } = await supabase
    .from('logboeken')
    .select('id, stage_id')
    .eq('id', entryId)
    .single();

  if (fetchError || !entry) {
    return res.status(404).json({ error: 'Entry niet gevonden' });
  }

  const stage = await getStageForStudent(supabase, entry.stage_id, req.user.id);
  if (!stage) return res.status(403).json({ error: 'Geen toegang tot deze entry' });

  const { error } = await supabase
    .from('logboeken')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('Fout bij verwijderen entry:', error);
    return res.status(500).json({ error: 'Kon entry niet verwijderen' });
  }

  res.json({ ok: true });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatum(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function formatDatumVolledig(d) {
  return `${formatDatum(d)}/${d.getFullYear()}`;
}

/**
 * Berekent het weeknummer relatief aan de startdatum van de stage.
 * Week 1 = de week waarin de stage begint.
 */
function berekenWeeknummer(datum, startDatum) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = datum.getTime() - startDatum.getTime();
  return Math.max(1, Math.floor(diff / msPerWeek) + 1);
}

/**
 * Zet een Supabase logboek-rij om naar het formaat dat de Vue-component verwacht.
 * LO's worden opgeslagen in het veld "problemen"; pas dit aan als je een apart veld gebruikt.
 */
function mapEntry(row) {
  const losString = row.problemen ?? '';
  const losArray = losString
    ? losString.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const datum = row.datum_van ? row.datum_van.slice(5).split('-').reverse().join('/') : '';

  return {
    id: row.id,
    datum,
    taak: row.taken ?? '',
    uren: row.uren_gemaakt ?? 0,
    los: losString,
    losArray,
    reflectie: row.reflectie ?? '',
    leerpunten: row.leerpunten ?? '',
    open: false,
  };
}

export default router;
