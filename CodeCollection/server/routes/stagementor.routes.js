import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
console.log('Stagementor routes geladen');

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

function requireStagementor(req, res, next) {
  if (req.user.rol !== 'stagementor') {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

// Helper: haalt de stage op die bij deze mentor + student hoort
async function getStageVoorMentor(supabase, studentId, mentorId) {
  const { data, error } = await supabase
    .from('stages')
    .select('id, student_id, stagementor_id, start_datum, eind_datum, status, stagevoorstel_id')
    .eq('student_id', studentId)
    .eq('stagementor_id', mentorId)
    .single();

  if (error || !data) return null;
  return data;
}

// ── GET /api/stagementor/studenten ────────────────────────────────────────────
router.get('/studenten', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const mentorId = req.user.id;

  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select(`
      id,
      status,
      start_datum,
      eind_datum,
      student:gebruikers!student_id (
        id,
        voornaam,
        achternaam,
        email
      ),
      stagevoorstel:stagevoorstellen!stagevoorstel_id (
        id,
        bedrijfsnaam
      )
    `)
    .eq('stagementor_id', mentorId);

  if (stagesError) {
    console.error('Fout bij ophalen stages:', stagesError);
    return res.status(500).json({ error: 'Kon studenten niet ophalen' });
  }

  if (!stages || stages.length === 0) {
    return res.json([]);
  }

  const stageIds = stages.map(s => s.id);
  const studentIds = stages.map(s => s.student?.id).filter(Boolean);

  const { data: opleidingen } = await supabase
    .from('opleidingen')
    .select('gebruiker_id, naam')
    .in('gebruiker_id', studentIds.length > 0 ? studentIds : [0]);

  const opleidingPerStudent = {};
  for (const o of opleidingen || []) {
    opleidingPerStudent[o.gebruiker_id] = o.naam;
  }

  const { data: logboeken } = await supabase
    .from('logboeken')
    .select('stage_id, week_nummer, afgetekend')
    .in('stage_id', stageIds)
    .order('week_nummer', { ascending: false });

  const logboekPerStage = {};
  for (const l of logboeken || []) {
    if (!logboekPerStage[l.stage_id]) {
      logboekPerStage[l.stage_id] = l;
    }
  }

  const result = stages.map(stage => {
    const logboek = logboekPerStage[stage.id];

    let logboekStatus = 'Niet ingediend';
    if (logboek) {
      logboekStatus = logboek.afgetekend
        ? `Week ${logboek.week_nummer} afgetekend`
        : `Week ${logboek.week_nummer} in afwachting`;
    }

    return {
      id:                   stage.student?.id,
      stage_id:             stage.id,
      voornaam:             stage.student?.voornaam   ?? '',
      achternaam:           stage.student?.achternaam ?? '',
      email:                stage.student?.email      ?? '',
      opleiding:            opleidingPerStudent[stage.student?.id] ?? '',
      bedrijf:              stage.stagevoorstel?.bedrijfsnaam ?? '',
      start_datum:          stage.start_datum,
      eind_datum:           stage.eind_datum,
      stagevoorstel_status: stage.status ?? 'Niet ingediend',
      logboek_status:       logboekStatus,
    };
  });

  res.json(result);
});

// ── GET /api/stagementor/student/:studentId/info ─────────────────────────────
router.get('/student/:studentId/info', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.params.studentId;
  const mentorId = req.user.id;

  const stage = await getStageVoorMentor(supabase, studentId, mentorId);
  if (!stage) return res.status(404).json({ error: 'Stage niet gevonden' });

  const { data: student } = await supabase
    .from('gebruikers')
    .select('id, voornaam, achternaam, email')
    .eq('id', studentId)
    .single();

  const { data: opleiding } = await supabase
    .from('opleidingen')
    .select('naam')
    .eq('gebruiker_id', studentId)
    .maybeSingle();

  const { data: mentor } = await supabase
    .from('gebruikers')
    .select('voornaam, achternaam')
    .eq('id', mentorId)
    .single();

  const { data: voorstel } = await supabase
    .from('stagevoorstellen')
    .select('bedrijfsnaam')
    .eq('id', stage.stagevoorstel_id)
    .maybeSingle();

  res.json({
    stage_id: stage.id,
    student: {
      id: student?.id,
      voornaam: student?.voornaam ?? '',
      achternaam: student?.achternaam ?? '',
      email: student?.email ?? '',
      opleiding: opleiding?.naam ?? '',
    },
    stage: {
      start_datum: stage.start_datum,
      eind_datum: stage.eind_datum,
      status: stage.status,
      bedrijf: voorstel?.bedrijfsnaam ?? '',
    },
    mentor: {
      naam: `${mentor?.voornaam ?? ''} ${mentor?.achternaam ?? ''}`.trim(),
    }
  });
});

// ── GET /api/stagementor/student/:studentId/logboek ──────────────────────────
router.get('/student/:studentId/logboek', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.params.studentId;
  const mentorId = req.user.id;

  const stage = await getStageVoorMentor(supabase, studentId, mentorId);
  if (!stage) return res.status(404).json({ error: 'Stage niet gevonden' });

  const { data: regels, error } = await supabase
    .from('logboeken')
    .select(`
      id, week_nummer, datum_van, taken, reflectie, leerpunten, uren_gemaakt, status, afgetekend, afgetekend_op,
      competenties_logboeken (
        competenties ( id, naam )
      )
    `)
    .eq('stage_id', stage.id)
    .order('week_nummer', { ascending: true })
    .order('datum_van', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const weken = {};
  for (const r of regels || []) {
    if (!weken[r.week_nummer]) {
      weken[r.week_nummer] = {
        nummer: r.week_nummer,
        status: r.afgetekend ? 'Afgetekend' : (r.status || 'Ingediend'),
        afgetekend: r.afgetekend,
        dagen: []
      };
    }

    const competenties = (r.competenties_logboeken || [])
      .map(cl => cl.competenties)
      .filter(Boolean);

    weken[r.week_nummer].dagen.push({
      id: r.id,
      datum: r.datum_van,
      taak: r.taken,
      reflectie: r.reflectie,
      leerpunten: r.leerpunten,
      uren: Number(r.uren_gemaakt) || 0,
      competenties
    });
  }

  res.json(Object.values(weken));
});

// ── GET /api/stagementor/student/:studentId/documenten ───────────────────────
router.get('/student/:studentId/documenten', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.params.studentId;
  const mentorId = req.user.id;

  const stage = await getStageVoorMentor(supabase, studentId, mentorId);
  if (!stage) return res.status(404).json({ error: 'Stage niet gevonden' });

  const docs = [];

  const { data: voorstel } = await supabase
    .from('stagevoorstellen')
    .select('id, bedrijfsnaam, indieningsdatum, ondertekend')
    .eq('id', stage.stagevoorstel_id)
    .maybeSingle();

  if (voorstel) {
    docs.push({
      type: 'stagevoorstel',
      naam: `Stagevoorstel - ${voorstel.bedrijfsnaam || 'onbekend bedrijf'}`,
      datum: voorstel.indieningsdatum,
      beschikbaar: true,
      meta: voorstel.ondertekend ? 'Ondertekend' : 'Niet ondertekend'
    });
  }

  const { data: eindEval } = await supabase
    .from('evaluaties')
    .select('id, score, aangemaakt_op')
    .eq('stage_id', stage.id)
    .eq('type', 'eind')
    .maybeSingle();

  docs.push({
    type: 'eindevaluatie',
    naam: 'Eindevaluatie',
    datum: eindEval?.aangemaakt_op ?? null,
    beschikbaar: !!eindEval,
    meta: eindEval ? `Score: ${eindEval.score ?? '—'}` : 'Nog niet beschikbaar'
  });

  res.json(docs);
});

export default router;