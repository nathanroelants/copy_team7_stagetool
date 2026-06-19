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

function requireStudent(req, res, next) {
  const rollen = req.user.rollen || (req.user.rol ? [req.user.rol] : []);
  if (!rollen.includes('student')) {
    return res.status(403).json({ error: 'Geen toegang' });
  }
  next();
}

// GET /api/student/competenties
router.get('/competenties', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.user.id; // ✅ student is ingelogd, id komt uit token

  // Stap 1: haal opleiding_id op via gebruiker_opleidingen, fallback naar gebruikers
  const { data: koppeling } = await supabase
    .from('gebruiker_opleidingen')
    .select('opleiding_id')
    .eq('gebruiker_id', studentId)
    .maybeSingle();

  let opleidingId = koppeling?.opleiding_id;

  if (!opleidingId) {
    const { data: gebruiker } = await supabase
      .from('gebruikers')
      .select('opleiding_id')
      .eq('id', studentId)
      .maybeSingle();
    opleidingId = gebruiker?.opleiding_id;
  }

  if (!opleidingId) {
    return res.status(404).json({ error: 'Geen opleiding gevonden voor deze student' });
  }

  // Stap 2: competenties gefilterd op opleiding
  const { data, error } = await supabase
    .from('competenties')
    .select('*')
    .eq('actief', true)
    .eq('opleiding_id', opleidingId)
    .order('volgorde', { ascending: true });

  if (error) {
    console.error('Fout bij ophalen competenties:', error);
    return res.status(500).json({ error: 'Kon competenties niet ophalen' });
  }

  const competenties = (data || []).map(c => {
    const vind = (n) => {
      const key = Object.keys(c).find(
        k => k.includes('beschrijving') && k.includes(String(n))
      );
      return key ? c[key] : null;
    };
    return {
      ...c,
      beschrijving_5: vind(5),
      beschrijving_3: vind(3),
      beschrijving_0: vind(0),
    };
  });

  res.json(competenties);
});

// GET /api/student/evaluaties
// Geeft ook evaluatie_status mee zodat de frontend de juiste modus kan tonen
router.get('/evaluaties', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.user.id;

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, evaluatie_status')
    .eq('student_id', studentId)
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

  // evaluatie_status meesturen zodat de frontend de juiste modus toont
  res.json({ evaluatie_status: stage.evaluatie_status, evaluaties: data });
});

// POST /api/student/evaluaties
router.post('/evaluaties', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.user.id;
  const { competentie_id, type, score, feedback } = req.body;

  if (!competentie_id || !type || !feedback) {
    return res.status(400).json({ error: 'competentie_id, type en feedback zijn verplicht' });
  }

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, evaluatie_status')
    .eq('student_id', studentId)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Geen stage gevonden voor deze student' });
  }

  // Schrijftoegang bewaken op basis van evaluatie_status
  const status = stage.evaluatie_status;
  const schrijfToegestaan =
    (type === 'tussentijds' && status === 'tussentijds') ||
    (type === 'eindevaluatie' && status === 'eindevaluatie');

  if (!schrijfToegestaan) {
    return res.status(403).json({ error: 'Opslaan is niet toegestaan in de huidige fase.' });
  }

  const { data: bestaande } = await supabase
    .from('evaluaties')
    .select('id')
    .eq('stage_id', stage.id)
    .eq('competentie_id', competentie_id)
    .eq('beoordelaar_id', studentId)
    .eq('type', type)
    .maybeSingle();

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
        beoordelaar_id: studentId,
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

// GET /api/student/documenten
router.get('/documenten', requireAuth, requireStudent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const studentId = req.user.id;

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, stagevoorstel_id')
    .eq('student_id', studentId)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Geen stage gevonden' });
  }

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

  res.json({ stage_id: stage.id, docs });
});

export default router;