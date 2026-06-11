import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Geen token aanwezig' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ongeldig token' });
  }
}

function generatePassword() {
  return Math.random().toString(36).slice(-10);
}

// GET /api/stagevoorstellen/mijn
router.get('/mijn', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('stages')
    .select(`
      id, status, start_datum, eind_datum,
      docent_id, stagementor_id,
      stagevoorstellen (*)
    `)
    .eq('student_id', req.user.id)
    .order('aangemaakt_op', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// POST /api/stagevoorstellen
router.post('/', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const {
    bedrijfsnaam, naam_stagementor, email_stagementor,
    stage_begin, stage_einde, beschrijving,
    technische_skills, tools, straat, huisnummer, gemeente, land
  } = req.body;

  if (!bedrijfsnaam || !stage_begin || !stage_einde || !beschrijving ||
      !naam_stagementor || !email_stagementor || !straat || !gemeente) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  // Stagementor zoeken of aanmaken
  let stagementorId;
  const { data: bestaandeMentor } = await supabase
    .from('gebruikers')
    .select('id')
    .eq('email', email_stagementor)
    .single();

  if (bestaandeMentor) {
    stagementorId = bestaandeMentor.id;
  } else {
    const voornaam = naam_stagementor.split(' ')[0] || naam_stagementor;
    const achternaam = naam_stagementor.split(' ').slice(1).join(' ') || '';

    const { data: nieuweMentor, error: mentorError } = await supabase
      .from('gebruikers')
      .insert([{
        voornaam, achternaam,
        email: email_stagementor,
        wachtwoord_hash: generatePassword(),
        rol: 'stagementor',
        actief: false
      }])
      .select()
      .single();

    if (mentorError) {
      return res.status(500).json({ error: 'Fout stagementor: ' + mentorError.message });
    }
    stagementorId = nieuweMentor.id;
  }

  // Stagevoorstel aanmaken
  const { data: voorstel, error: voorstelError } = await supabase
    .from('stagevoorstellen')
    .insert([{
      bedrijfsnaam, beschrijving, technische_skills, tools,
      straat, huisnummer, gemeente, land,
      indieningsdatum: new Date().toISOString()
    }])
    .select()
    .single();

  if (voorstelError) {
    return res.status(500).json({ error: 'Fout voorstel: ' + voorstelError.message });
  }

  // Stage aanmaken
  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .insert([{
      student_id: req.user.id,
      stagevoorstel_id: voorstel.id,
      stagementor_id: stagementorId,
      docent_id: null,
      status: 'stagevoorstel ingediend',
      start_datum: stage_begin,
      eind_datum: stage_einde
    }])
    .select()
    .single();

  if (stageError) {
    return res.status(500).json({ error: 'Fout stage: ' + stageError.message });
  }

  res.json({ stage, voorstel });
});

// PUT /api/stagevoorstellen/:id - update voorstel (na aanpassingen vereist)
router.put('/:id', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const stageId = req.params.id;

  const {
    bedrijfsnaam, stage_begin, stage_einde, beschrijving,
    technische_skills, tools, straat, huisnummer, gemeente, land
  } = req.body;

  const { data: stage, error: findError } = await supabase
    .from('stages')
    .select('id, student_id, stagevoorstel_id, status')
    .eq('id', stageId)
    .single();

  if (findError || !stage) {
    return res.status(404).json({ error: 'Stage niet gevonden' });
  }

  if (stage.student_id !== req.user.id) {
    return res.status(403).json({ error: 'Geen toegang' });
  }

  if (stage.status !== 'stagevoorstel aanpassingen vereist') {
    return res.status(400).json({ error: 'Niet aanpasbaar in deze status' });
  }

  const { error: voorstelError } = await supabase
    .from('stagevoorstellen')
    .update({
      bedrijfsnaam, beschrijving, technische_skills, tools,
      straat, huisnummer, gemeente, land,
      indieningsdatum: new Date().toISOString()
    })
    .eq('id', stage.stagevoorstel_id);

  if (voorstelError) {
    return res.status(500).json({ error: voorstelError.message });
  }

  const { data: updatedStage, error: stageError } = await supabase
    .from('stages')
    .update({
      start_datum: stage_begin,
      eind_datum: stage_einde,
      status: 'stagevoorstel ingediend'
    })
    .eq('id', stageId)
    .select()
    .single();

  if (stageError) {
    return res.status(500).json({ error: stageError.message });
  }

  res.json(updatedStage);
});

export default router;