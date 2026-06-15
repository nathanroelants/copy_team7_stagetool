import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Geen token aanwezig' });

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.rol !== 'administratie') {
      return res.status(403).json({ error: 'Alleen administratie heeft toegang' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ongeldig token' });
  }
}

// Helper: valida que a soma das percentagens da opleiding é exatamente 100
async function validatePercentageTotal(supabase, opleidingId, excludeId = null, newPercentage = 0) {
  let query = supabase
    .from('competenties')
    .select('id, percentage')
    .eq('opleiding_id', opleidingId);

  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error) throw error;

  const currentTotal = data.reduce((sum, c) => sum + Number(c.percentage), 0);
  const newTotal = currentTotal + Number(newPercentage);
  return { valid: newTotal === 100, total: newTotal };
}

// GET /api/admin/opleidingen — todas opleidingen com competenties aninhadas
router.get('/opleidingen', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('opleidingen')
    .select(`
      id, naam,
      competenties (id, naam, beschrijving, percentage, volgorde, actief, opleiding_id)
    `)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Ordena competenties por volgorde dentro de cada opleiding
  data.forEach(o => {
    if (o.competenties) o.competenties.sort((a, b) => a.volgorde - b.volgorde);
  });

  res.json(data);
});
// POST /api/admin/competenties — criar
router.post('/competenties', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { naam, beschrijving, percentage, volgorde, actief, opleiding_id } = req.body;

  if (!naam || percentage == null || volgorde == null || actief == null || !opleiding_id) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  try {
    const { data, error } = await supabase
      .from('competenties')
      .insert([{ naam, beschrijving, percentage, volgorde, actief, opleiding_id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/competenties/:id — editar
router.put('/competenties/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;
  const { naam, beschrijving, percentage, volgorde, actief, opleiding_id } = req.body;

  if (!naam || percentage == null || volgorde == null || actief == null || !opleiding_id) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  try {
    const { data, error } = await supabase
      .from('competenties')
      .update({ naam, beschrijving, percentage, volgorde, actief, opleiding_id })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
});

// DELETE /api/admin/competenties/:id — apagar
router.delete('/competenties/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;

  const { error } = await supabase
    .from('competenties')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;