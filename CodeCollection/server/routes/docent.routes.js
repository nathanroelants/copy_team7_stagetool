import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
console.log('Docent routes geladen');

// ── Middleware: JWT controleren ──────────────────────────────────────────────
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

// ── Middleware: alleen docenten ──────────────────────────────────────────────
function requireDocent(req, res, next) {
  if (req.user.rol !== 'docent') {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

// ── GET /api/docent/studenten ────────────────────────────────────────────────
// Geeft alle studenten terug waarvan de ingelogde docent docent_begeleider_id is.
// Joins: gebruikers (student), stagevoorstellen, logboeken (meest recente week)
router.get('/test', (req, res) => {
  res.json({ ok: true });
});
router.get('/studenten', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const docentId = req.user.id;

  // 1. Haal alle stages op waar deze docent begeleider van is
  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select(`
      id,
      status,
      start_datum,
      eind_datum,
      stagevoorstel_id,
      student:gebruikers!stages_student_id_fkey (
        id,
        voornaam,
        achternaam,
        email
      ),
      bedrijfsbegeleider:gebruikers!stages_bedrijfsbegeleider_id_fkey (
        voornaam,
        achternaam
      )
    `)
    .eq('docent_id', docentId);

  if (stagesError) {
    console.error('Fout bij ophalen stages:', stagesError);
    return res.status(500).json({ error: 'Kon stage studenten niet ophalen' });
  }

  if (!stages || stages.length === 0) {
    return res.json([]);
  }

  const stageIds = stages.map(s => s.id);
  const voorstelIds = stages.map(s => s.stagevoorstel_id).filter(Boolean);

  // 2. Haal stagevoorstellen op (status + bedrijfsnaam)
  const { data: voorstellen } = await supabase
    .from('stagevoorstellen')
    .select('id, status, bedrijfsnaam, stage_begin, stage_einde')
    .in('id', voorstelIds.length > 0 ? voorstelIds : [0]);

  // 3. Haal het meest recente logboek per stage op
  const { data: logboeken } = await supabase
    .from('logboeken')
    .select('stage_id, week_nummer, status, afgetekend')
    .in('stage_id', stageIds)
    .order('week_nummer', { ascending: false });

  // ── Indexeren voor snelle lookup ─────────────────────────────────────────
  const voorstelPerId = {};
  for (const v of voorstellen || []) {
    voorstelPerId[v.id] = v;
  }

  // Meest recente logboekweek per stage (eerste na desc sort)
  const logboekPerStage = {};
  for (const l of logboeken || []) {
    if (!logboekPerStage[l.stage_id]) {
      logboekPerStage[l.stage_id] = l;
    }
  }

  // ── Samenstellen response ─────────────────────────────────────────────────
  const result = stages.map(stage => {
    const voorstel = voorstelPerId[stage.stagevoorstel_id];
    const logboek  = logboekPerStage[stage.id];

    // Logboek statustekst
    let logboekStatus = 'Niet ingediend';
    if (logboek) {
      if (logboek.afgetekend) {
        logboekStatus = `Week ${logboek.week_nummer} afgetekend`;
      } else {
        logboekStatus = `Week ${logboek.week_nummer} in afwachting`;
      }
    }

    return {
      id: stage.id,
      voornaam:  stage.student?.voornaam  ?? '',
      achternaam: stage.student?.achternaam ?? '',
      email:     stage.student?.email     ?? '',
      bedrijf:   voorstel?.bedrijfsnaam   ?? stage.bedrijfsbegeleider
                   ? `${stage.bedrijfsbegeleider?.voornaam ?? ''} ${stage.bedrijfsbegeleider?.achternaam ?? ''}`.trim()
                   : '',
      opleiding: '',           // koppel opleidingen-tabel indien gewenst (zie opmerking onderaan)
      start_datum: voorstel?.stage_begin ?? stage.start_datum,
      eind_datum:  voorstel?.stage_einde ?? stage.eind_datum,
      mentor_naam: stage.bedrijfsbegeleider
        ? `${stage.bedrijfsbegeleider.voornaam} ${stage.bedrijfsbegeleider.achternaam}`.trim()
        : null,
      stagevoorstel_status: voorstel?.status ?? 'Niet ingediend',
      logboek_status:       logboekStatus,
      evaluatie_status:     stage.status   ?? 'Niet beschikbaar',
    };
  });

  res.json(result);
})
router.get('/test', (req, res) => {
  res.json({ ok: false });
});

export default router;
