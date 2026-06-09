import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

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

function requireDocent(req, res, next) {
  if (req.user.rol !== 'docent') {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

router.get('/studenten', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const docentId = req.user.id;

  // 1. Haal stages op voor deze docent, met alle gerelateerde data in één query
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
      stagementor:gebruikers!stagementor_id (
        voornaam,
        achternaam
      ),
      stagevoorstel:stagevoorstellen!stagevoorstel_id (
        id,
        bedrijfsnaam,
        stage_begin,
        stage_einde,
        status
      )
    `)
    .eq('docent_id', docentId);

  if (stagesError) {
    console.error('Fout bij ophalen stages:', stagesError);
    return res.status(500).json({ error: 'Kon studenten niet ophalen' });
  }

  if (!stages || stages.length === 0) {
    return res.json([]);
  }

  const stageIds = stages.map(s => s.id);
  const studentIds = stages.map(s => s.student?.id).filter(Boolean);

  // 2. Haal opleidingen op via gebruiker_id
  const { data: opleidingen } = await supabase
    .from('opleidingen')
    .select('gebruiker_id, naam')
    .in('gebruiker_id', studentIds.length > 0 ? studentIds : [0]);

  const opleidingPerStudent = {};
  for (const o of opleidingen || []) {
    opleidingPerStudent[o.gebruiker_id] = o.naam;
  }

  // 3. Haal meest recente logboek per stage op
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

  // 4. Samenstellen response
  const result = stages.map(stage => {
    const logboek = logboekPerStage[stage.id];

    let logboekStatus = 'Niet ingediend';
    if (logboek) {
      logboekStatus = logboek.afgetekend
        ? `Week ${logboek.week_nummer} afgetekend`
        : `Week ${logboek.week_nummer} in afwachting`;
    }

    return {
      id:         stage.id,
      voornaam:   stage.student?.voornaam   ?? '',
      achternaam: stage.student?.achternaam ?? '',
      email:      stage.student?.email      ?? '',
      opleiding:  opleidingPerStudent[stage.student?.id] ?? '',
      bedrijf:    stage.stagevoorstel?.bedrijfsnaam ?? '',
      start_datum: stage.stagevoorstel?.stage_begin ?? stage.start_datum,
      eind_datum:  stage.stagevoorstel?.stage_einde ?? stage.eind_datum,
      mentor_naam: stage.stagementor
        ? `${stage.stagementor.voornaam} ${stage.stagementor.achternaam}`.trim()
        : null,
      stagevoorstel_status: stage.stagevoorstel?.status ?? 'Niet ingediend',
      logboek_status:       logboekStatus,
      evaluatie_status:     stage.status ?? 'Niet beschikbaar',
    };
  });

  res.json(result);
});

export default router;
