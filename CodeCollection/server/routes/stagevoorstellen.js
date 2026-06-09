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

// Helper: genereert random wachtwoord
function generatePassword() {
  return Math.random().toString(36).slice(-10);
}

// GET /api/stagevoorstellen/mijn - haalt het meest recente voorstel op van de ingelogde student
router.get('/mijn', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  // Haal stages op van de student met hun stageinfo
  const { data, error } = await supabase
    .from('stages')
    .select(`
      id,
      status,
      docent_id,
      stagementor_id,
      stageinfo (*)
    `)
    .eq('student_id', req.user.id)
    .order('aangemaakt_op', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// POST /api/stagevoorstellen - maakt een nieuw voorstel
router.post('/', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const {
    bedrijfsnaam,
    naam_stagementor,
    email_stagementor,
    stage_begin,
    stage_einde,
    beschrijving,
    technische_skills,
    tools,
    straat,
    huisnummer,
    gemeente,
    land
  } = req.body;

  // Validatie
  if (!bedrijfsnaam || !stage_begin || !stage_einde || !beschrijving ||
      !naam_stagementor || !email_stagementor || !straat || !gemeente) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  // STAP 1: Check of stagementor al bestaat in gebruikers
  let stagementorId;

  const { data: bestaandeMentor } = await supabase
    .from('gebruikers')
    .select('id')
    .eq('email', email_stagementor)
    .single();

  if (bestaandeMentor) {
    // Stagementor bestaat al → gebruik bestaande
    stagementorId = bestaandeMentor.id;
  } else {
    // Stagementor bestaat niet → maak nieuwe aan
    const voornaam = naam_stagementor.split(' ')[0] || naam_stagementor;
    const achternaam = naam_stagementor.split(' ').slice(1).join(' ') || '';

    const { data: nieuweMentor, error: mentorError } = await supabase
      .from('gebruikers')
      .insert([{
        voornaam,
        achternaam,
        email: email_stagementor,
        wachtwoord_hash: generatePassword(),
        rol: 'stagementor'
      }])
      .select()
      .single();

    if (mentorError) {
      return res.status(500).json({ error: 'Fout bij aanmaken stagementor: ' + mentorError.message });
    }

    stagementorId = nieuweMentor.id;
  }

  // STAP 2: Maak de stageinfo aan
  const { data: stageinfo, error: infoError } = await supabase
    .from('stageinfo')
    .insert([{
      bedrijfsnaam,
   
      beschrijving,
      technische_skills,
      tools,
      straat,
      huisnummer,
      gemeente,
      land,
      indieningsdatum: new Date().toISOString()
    }])
    .select()
    .single();

  if (infoError) {
    return res.status(500).json({ error: 'Fout bij aanmaken stageinfo: ' + infoError.message });
  }

  // STAP 3: Maak de stage aan
  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .insert([{
      student_id: req.user.id,
      stageinfo_id: stageinfo.id,
      stagementor_id: stagementorId,
      docent_id: null,
      status: 'niet gestart',
      start_datum: stage_begin,
      eind_datum: stage_einde
    }])
    .select()
    .single();

  if (stageError) {
    return res.status(500).json({ error: 'Fout bij aanmaken stage: ' + stageError.message });
  }

  // Geef alles terug
  res.json({
    stage,
    stageinfo
  });
});

export default router;