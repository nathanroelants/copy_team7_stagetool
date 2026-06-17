import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

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

// GET /api/docent/competenties
router.get('/competenties', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('competenties')
    .select('*')
    .eq('actief', true)
    .order('volgorde', { ascending: true });

  if (error) {
    console.error('Fout bij ophalen competenties:', error);
    return res.status(500).json({ error: 'DEBUG competenties: ' + (error.message || JSON.stringify(error)) });
  }

  res.json(data);
});

// GET /api/docent/evaluaties/:studentId
router.get('/evaluaties/:studentId', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { studentId } = req.params;

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, student_id, stagementor_id')
    .eq('student_id', studentId)
    .eq('docent_id', req.user.id)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Geen stage gevonden voor deze student' });
  }

  const { data, error } = await supabase
    .from('evaluaties')
    .select('id, competentie_id, beoordelaar_id, type, score, feedback, zichtbaar_voor_student')
    .eq('stage_id', stage.id);

  if (error) {
    console.error('Fout bij ophalen evaluaties:', error);
    return res.status(500).json({ error: 'Kon evaluaties niet ophalen' });
  }

  const evaluaties = (data || []).map(e => ({
    ...e,
    rol: e.beoordelaar_id === stage.student_id
      ? 'student'
      : e.beoordelaar_id === stage.stagementor_id
        ? 'stagementor'
        : e.beoordelaar_id === req.user.id
          ? 'docent'
          : 'onbekend',
  }));

  res.json({
    eindevaluatie_open: stage.eindevaluatie_open ?? false,
    evaluaties,
  });
});


// POST /api/docent/evaluaties/:studentId
router.post('/evaluaties/:studentId', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const docentId = req.user.id;
  const { studentId } = req.params;
  const { competentie_id, type, score, feedback } = req.body;

  if (!competentie_id || !type || !feedback) {
    return res.status(400).json({ error: 'competentie_id, type en feedback zijn verplicht' });
  }

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id')
    .eq('student_id', studentId)
    .eq('docent_id', docentId)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Geen stage gevonden voor deze student' });
  }

  const { data: bestaande } = await supabase
    .from('evaluaties')
    .select('id')
    .eq('stage_id', stage.id)
    .eq('competentie_id', competentie_id)
    .eq('beoordelaar_id', docentId)
    .eq('type', type)
    .single();

  let result, error;

  if (bestaande) {
    ({ data: result, error } = await supabase
      .from('evaluaties')
      .update({ score, feedback, bijgewerkt_op: new Date() })
      .eq('id', bestaande.id)
      .select()
      .single());
  } else {
    ({ data: result, error } = await supabase
      .from('evaluaties')
      .insert({
        stage_id: stage.id,
        competentie_id,
        beoordelaar_id: docentId,
        type,
        score,
        feedback,
        zichtbaar_voor_student: false,
      })
      .select()
      .single());
  }

  if (error) {
    console.error('Fout bij opslaan evaluatie:', error);
    return res.status(500).json({ error: 'Kon evaluatie niet opslaan' });
  }

  res.json(result);
});

// PATCH /api/docent/eindevaluatie/:studentId
router.patch('/eindevaluatie/:studentId', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { studentId } = req.params;
  const { eindevaluatie_open } = req.body;

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id')
    .eq('student_id', studentId)
    .eq('docent_id', req.user.id)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Geen stage gevonden voor deze student' });
  }

  const { data, error } = await supabase
    .from('stages')
    .update({ eindevaluatie_open: !!eindevaluatie_open })
    .eq('id', stage.id)
    .select('id, eindevaluatie_open')
    .single();

  if (error) {
    console.error('Fout bij bijwerken eindevaluatie:', error);
    return res.status(500).json({ error: 'Kon eindevaluatie niet bijwerken' });
  }

  res.json(data);
});

export default router;
