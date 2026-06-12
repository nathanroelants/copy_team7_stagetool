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

// GET /api/admin/gebruikers - alle gebruikers met opleiding
router.get('/gebruikers', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('gebruikers')
    .select(`
      id, voornaam, achternaam, email, rol, actief, aangemaakt_op,
      opleidingen (naam)
    `)
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// POST /api/admin/gebruikers - nieuwe gebruiker aanmaken
router.post('/gebruikers', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { voornaam, achternaam, email, rol, opleiding } = req.body;

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

  // Opleiding toevoegen indien aanwezig
  if (opleiding) {
    await supabase
      .from('opleidingen')
      .insert([{ gebruiker_id: gebruiker.id, naam: opleiding }]);
  }

  res.json(gebruiker);
});

// PUT /api/admin/gebruikers/:id - gebruiker bijwerken
router.put('/gebruikers/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;
  const { voornaam, achternaam, email, rol, opleiding, actief } = req.body;

  const { data: gebruiker, error } = await supabase
    .from('gebruikers')
    .update({ voornaam, achternaam, email, rol, actief })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Update of insert opleiding
  if (opleiding !== undefined) {
    const { data: bestaande } = await supabase
      .from('opleidingen')
      .select('id')
      .eq('gebruiker_id', id)
      .single();

    if (bestaande) {
      await supabase.from('opleidingen').update({ naam: opleiding }).eq('id', bestaande.id);
    } else if (opleiding) {
      await supabase.from('opleidingen').insert([{ gebruiker_id: id, naam: opleiding }]);
    }
  }

  res.json(gebruiker);
});

// DELETE /api/admin/gebruikers/:id - gebruiker verwijderen
router.delete('/gebruikers/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;

  // Opleidingen eerst verwijderen
  await supabase.from('opleidingen').delete().eq('gebruiker_id', id);

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