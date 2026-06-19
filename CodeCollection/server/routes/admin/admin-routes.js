import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = express.Router();

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Geen token aanwezig' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rollen = decoded.rollen || (decoded.rol ? [decoded.rol] : []);
    if (!rollen.includes('administratie')) {
      return res.status(403).json({ error: 'Alleen administratie heeft toegang' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ongeldig token' });
  }
}

// Wachtwoord validatie: min 8 chars, 1 hoofdletter, 1 kleine letter, 1 cijfer
function validatePassword(wachtwoord) {
  if (!wachtwoord || wachtwoord.length < 8) {
    return 'Wachtwoord moet minstens 8 karakters lang zijn';
  }
  if (!/[A-Z]/.test(wachtwoord)) {
    return 'Wachtwoord moet minstens één hoofdletter bevatten';
  }
  if (!/[a-z]/.test(wachtwoord)) {
    return 'Wachtwoord moet minstens één kleine letter bevatten';
  }
  if (!/[0-9]/.test(wachtwoord)) {
    return 'Wachtwoord moet minstens één cijfer bevatten';
  }
  return null;
}

// GET /api/admin/gebruikers
router.get('/gebruikers', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('gebruikers')
    .select(`
      id, voornaam, achternaam, email, actief, aangemaakt_op,
      gebruiker_opleidingen (
        opleiding_id,
        opleidingen ( id, naam )
      ),
      gebruiker_rollen ( rol )
    `)
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const result = data.map(g => ({
    ...g,
    opleidingen: (g.gebruiker_opleidingen || [])
      .map(go => go.opleidingen)
      .filter(Boolean),
    rollen: (g.gebruiker_rollen || []).map(gr => gr.rol)
  }));

  result.forEach(g => {
    delete g.gebruiker_opleidingen;
    delete g.gebruiker_rollen;
  });

  res.json(result);
});

// GET /api/admin/opleidingen-lijst
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

// POST /api/admin/gebruikers
router.post('/gebruikers', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { voornaam, achternaam, email, rollen, opleiding_ids, wachtwoord } = req.body;

  if (!voornaam || !achternaam || !email || !wachtwoord) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  if (!Array.isArray(rollen) || rollen.length === 0) {
    return res.status(400).json({ error: 'Minstens één rol is verplicht' });
  }

  const passwordError = validatePassword(wachtwoord);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  let wachtwoord_hash;
  try {
    wachtwoord_hash = await bcrypt.hash(wachtwoord, 10);
  } catch (err) {
    return res.status(500).json({ error: 'Fout bij hashen van wachtwoord' });
  }

  const { data: gebruiker, error } = await supabase
    .from('gebruikers')
    .insert([{
      voornaam, achternaam, email,
      wachtwoord_hash,
      actief: true
    }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Rollen opslaan in gebruiker_rollen
  const rollenRows = rollen.map(r => ({ gebruiker_id: gebruiker.id, rol: r }));
  const { error: rollenError } = await supabase
    .from('gebruiker_rollen')
    .insert(rollenRows);

  if (rollenError) {
    return res.status(500).json({ error: rollenError.message });
  }

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

// PUT /api/admin/gebruikers/:id
router.put('/gebruikers/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;
  const { voornaam, achternaam, email, rollen, opleiding_ids, actief, wachtwoord } = req.body;

  if (Array.isArray(rollen) && rollen.length === 0) {
    return res.status(400).json({ error: 'Minstens één rol is verplicht' });
  }

  const updateData = { voornaam, achternaam, email, actief };

  // Wachtwoord is optioneel bij bewerken — alleen aanpassen indien opgegeven
  if (wachtwoord && wachtwoord.trim() !== '') {
    const passwordError = validatePassword(wachtwoord);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    try {
      updateData.wachtwoord_hash = await bcrypt.hash(wachtwoord, 10);
    } catch (err) {
      return res.status(500).json({ error: 'Fout bij hashen van wachtwoord' });
    }

    // Bepaal de rollen: gebruik de rollen uit de request, anders de huidige rollen uit de database
    let huidigeRollen = Array.isArray(rollen) && rollen.length > 0 ? rollen : null;
    if (!huidigeRollen) {
      const { data: huidigeRollenRows } = await supabase
        .from('gebruiker_rollen')
        .select('rol')
        .eq('gebruiker_id', id);
      huidigeRollen = (huidigeRollenRows || []).map(r => r.rol);
    }

    // Een stagementor die inactief was, wordt automatisch geactiveerd bij een wachtwoordwijziging
    if (huidigeRollen.includes('stagementor')) {
      updateData.actief = true;
    }
  }

  const { data: gebruiker, error } = await supabase
    .from('gebruikers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Rollen bijwerken via delete + insert
  if (Array.isArray(rollen) && rollen.length > 0) {
    await supabase
      .from('gebruiker_rollen')
      .delete()
      .eq('gebruiker_id', id);

    const rollenRows = rollen.map(r => ({ gebruiker_id: parseInt(id), rol: r }));
    const { error: rollenError } = await supabase
      .from('gebruiker_rollen')
      .insert(rollenRows);

    if (rollenError) {
      return res.status(500).json({ error: rollenError.message });
    }
  }

  if (Array.isArray(opleiding_ids)) {
    await supabase
      .from('gebruiker_opleidingen')
      .delete()
      .eq('gebruiker_id', id);

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

// DELETE /api/admin/gebruikers/:id
router.delete('/gebruikers/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;

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