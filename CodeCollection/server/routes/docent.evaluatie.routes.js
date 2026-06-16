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
    .select('id, naam, beschrijving, volgorde')
    .eq('actief', true)
    .order('volgorde', { ascending: true });

  if (error) {
    console.error('Fout bij ophalen competenties:', error);
    return res.status(500).json({ error: 'Kon competenties niet ophalen' });
  }

  res.json(data);
});

// GET /api/docent/evaluaties/:studentId
router.get('/evaluaties/:studentId', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { studentId } = req.params;

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, student_id, stagementor_id, eindevaluatie_open')
    .eq('student_id', studentId)
    .eq('docent_id', req.user.id)
    .single();

  if (stageError || !stage) {
    console.log('DEBUG evaluaties — studentId:', studentId, '| docent req.user.id:', req.user.id, '| stageError:', stageError);
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
        : 'onbekend',
  }));

  res.json({
    eindevaluatie_open: stage.eindevaluatie_open ?? false,
    evaluaties,
  });
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
