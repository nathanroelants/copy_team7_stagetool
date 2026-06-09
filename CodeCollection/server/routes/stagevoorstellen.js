import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware: verifica se o utilizador está autenticado
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

// GET /api/stagevoorstellen/mijn - haalt eigen voorstellen op
router.get('/mijn', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('stagevoorstellen')
    .select('*')
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

  const { bedrijfsnaam, adres, stage_begin, stage_einde, beschrijving } = req.body;

  // Validatie
  if (!bedrijfsnaam || !adres || !stage_begin || !stage_einde || !beschrijving) {
    return res.status(400).json({ error: 'Alle velden zijn verplicht' });
  }

  const { data, error } = await supabase
    .from('stagevoorstellen')
    .insert([{
      student_id: req.user.id,
      bedrijfsnaam,
      adres,
      stage_begin,
      stage_einde,
      beschrijving,
      status: 'ingediend',
      indieningsdatum: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

export default router;