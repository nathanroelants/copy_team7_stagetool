import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Geen token aanwezig' });
  }

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

function generatePassword() {
  return Math.random().toString(36).slice(-10);
}

// GET /api/admin/gebruikers - alle gebruikers met opleidingen
router.get('/gebruikers', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('gebruikers')
    .select(`
      id, voornaam, achternaam, email, rol, actief, aangemaakt_op,
      gebruiker_opleidingen (
        opleiding_id,
        opleidingen ( id, naam )
      )
    `)
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Flatten: para cada gebruiker, transformar em array simples [{id, naam}, ...]
  const result = data.map(g => ({
    ...g,
    opleidingen: (g.gebruiker_opleidingen || [])
      .map(go => go.opleidingen)
      .filter(Boolean)
  }));

  // Remover o campo intermediário
  result.forEach(g => delete g.gebruiker_opleidingen);

  res.json(result);
});

// GET /api/admin/opleidingen-lijst - lijst met alle beschikbare opleidingen (voor dropdown)
router.get('/opleidingen-lijst', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('opleidingen')
    .select('id, naam')
    .order('naam', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// POST /api/admin/gebruikers - nieuwe gebruiker aanmaken
router.post('/gebruikers', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { voornaam, achternaam, email, rol, opleiding_ids } = req.body;

  if (!voornaam || !achternaam || !email || !rol) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  const { data: gebruiker, error } = await supabase
    .from('gebruikers')
    .insert([{
      voornaam, achternaam, email, rol,
      wachtwoord_hash: generatePassword(),
      actief: true
    }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Opleidingen koppelen indien meegegeven
  if (Array.isArray(opleiding_ids) && opleiding_ids.length > 0) {
    const rows = opleiding_ids.map(oid => ({
      gebruiker_id: gebruiker.id,
      opleiding_id: oid
    }));
    const { error: koppelError } = await supabase
      .from('gebruiker_opleidingen')
      .insert(rows);

    if (koppelError) {
      return res.status(500).json({ error: koppelError.message });
    }
  }

  res.json(gebruiker);
});

// PUT /api/admin/gebruikers/:id - gebruiker bijwerken
router.put('/gebruikers/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;
  const { voornaam, achternaam, email, rol, opleiding_ids, actief } = req.body;

  const { data: gebruiker, error } = await supabase
    .from('gebruikers')
    .update({ voornaam, achternaam, email, rol, actief })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Update opleidingen: apaga as antigas e insere as novas
  if (Array.isArray(opleiding_ids)) {
    // Apagar links antigos
    await supabase
      .from('gebruiker_opleidingen')
      .delete()
      .eq('gebruiker_id', id);

    // Inserir os novos (se houver)
    if (opleiding_ids.length > 0) {
      const rows = opleiding_ids.map(oid => ({
        gebruiker_id: id,
        opleiding_id: oid
      }));
      const { error: koppelError } = await supabase
        .from('gebruiker_opleidingen')
        .insert(rows);

      if (koppelError) {
        return res.status(500).json({ error: koppelError.message });
      }
    }
  }

  res.json(gebruiker);
});

// DELETE /api/admin/gebruikers/:id - gebruiker verwijderen
router.delete('/gebruikers/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;

  // gebruiker_opleidingen é apagado automaticamente via ON DELETE CASCADE
  const { error } = await supabase
    .from('gebruikers')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

export default router;