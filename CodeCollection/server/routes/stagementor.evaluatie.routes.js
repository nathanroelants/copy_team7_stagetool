// routes/mentorEvaluatie.js
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

function requireMentor(req, res, next) {
  if (req.user.rol !== 'stagementor') {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

// Helper: controleer of mentor gekoppeld is aan stage van student
// Gebruikt stages.stagementor_id ipv een aparte koppeltabel
async function getMentorStage(supabase, mentorId, studentId) {
  const { data, error } = await supabase
    .from('stages')
    .select('id, evaluatie_status, student_id, stagementor_id')
    .eq('stagementor_id', mentorId)
    .eq('student_id', studentId)
    .single();

  if (error || !data) return null;
  return data;
}

// GET /api/mentor/studenten
// Haalt alle studenten op die gekoppeld zijn aan deze mentor
router.get('/studenten', requireAuth, requireMentor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const mentorId = req.user.id;

  const { data, error } = await supabase
    .from('stages')
    .select(`
      student_id,
      evaluatie_status,
      status,
      student:student_id (
        id,
        voornaam,
        achternaam,
        email
      )
    `)
    .eq('stagementor_id', mentorId);

  if (error) {
    console.error('Fout bij ophalen studenten:', error);
    return res.status(500).json({ error: 'Kon studenten niet ophalen' });
  }

  res.json(data);
});

// GET /api/mentor/student/:studentId
// Haalt gegevens op van een specifieke student
router.get('/student/:studentId', requireAuth, requireMentor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const mentorId = req.user.id;
  const studentId = req.params.studentId;

  // Controleer koppeling via stages tabel
  const stage = await getMentorStage(supabase, mentorId, studentId);
  if (!stage) {
    return res.status(403).json({ error: 'Geen toegang tot deze student' });
  }

  const { data, error } = await supabase
    .from('gebruikers')
    .select('id, voornaam, achternaam, email')
    .eq('id', studentId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Student niet gevonden' });
  }

  res.json(data);
});

// GET /api/mentor/:studentId/competenties
router.get('/:studentId/competenties', requireAuth, requireMentor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const mentorId = req.user.id;
  const studentId = req.params.studentId;

  // Controleer koppeling via stages tabel
  const stage = await getMentorStage(supabase, mentorId, studentId);
  if (!stage) {
    return res.status(403).json({ error: 'Geen toegang tot deze student' });
  }

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

// GET /api/mentor/:studentId/evaluaties
router.get('/:studentId/evaluaties', requireAuth, requireMentor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const mentorId = req.user.id;
  const studentId = req.params.studentId;

  // Controleer koppeling via stages tabel
  const stage = await getMentorStage(supabase, mentorId, studentId);
  if (!stage) {
    return res.status(403).json({ error: 'Geen toegang tot deze student' });
  }

  const { data, error } = await supabase
    .from('evaluaties')
    .select('id, competentie_id, beoordelaar_id, type, score, feedback, zichtbaar_voor_student')
    .eq('stage_id', stage.id);

  if (error) {
    console.error('Fout bij ophalen evaluaties:', error);
    return res.status(500).json({ error: 'Kon evaluaties niet ophalen' });
  }

  res.json({
    evaluatie_status: stage.evaluatie_status,
    evaluaties: data,
  });
});

// POST /api/mentor/:studentId/evaluaties
router.post('/:studentId/evaluaties', requireAuth, requireMentor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const mentorId = req.user.id;
  const studentId = req.params.studentId;
  const { competentie_id, type, score, feedback } = req.body;

  if (!competentie_id || !type || !feedback?.trim()) {
    return res.status(400).json({ error: 'competentie_id, type en feedback zijn verplicht' });
  }

  // Controleer koppeling via stages tabel
  const stage = await getMentorStage(supabase, mentorId, studentId);
  if (!stage) {
    return res.status(403).json({ error: 'Geen toegang tot deze student' });
  }

  // Score validatie (0, 3 of 5)
  const geldigeScores = [0, 3, 5];
  if (score !== null && score !== undefined && !geldigeScores.includes(Number(score))) {
    return res.status(400).json({ error: 'Ongeldige score. Kies 0, 3 of 5.' });
  }

  // Schrijftoegang bewaken op basis van evaluatie_status
  const schrijfToegestaan =
    (type === 'tussentijds' && stage.evaluatie_status === 'tussentijds') ||
    (type === 'eindevaluatie' && stage.evaluatie_status === 'eindevaluatie');

  if (!schrijfToegestaan) {
    return res.status(403).json({ error: 'Opslaan is niet toegestaan in de huidige fase.' });
  }

  // Zoek bestaande evaluatie van deze mentor
  const { data: bestaande } = await supabase
    .from('evaluaties')
    .select('id')
    .eq('stage_id', stage.id)
    .eq('competentie_id', competentie_id)
    .eq('beoordelaar_id', mentorId)
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
        beoordelaar_id: mentorId,
        type,
        score,
        feedback,
        zichtbaar_voor_student: true,
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

export default router;
