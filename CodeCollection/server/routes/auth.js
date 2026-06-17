import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = express.Router();
console.log('Auth routes geladen');

router.get('/test', (req, res) => {
  res.json({ ok: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
  }

  const supabase = req.app.get('supabase');

  const { data: gebruiker, error } = await supabase
    .from('gebruikers')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !gebruiker) {
    return res.status(401).json({ error: 'Gebruiker niet gevonden' });
  }

  if (!gebruiker.actief) {
    return res.status(401).json({ error: 'Account is niet actief' });
  }

  // Wachtwoord vergelijken met bcrypt
  let isGeldig = false;
  try {
    isGeldig = await bcrypt.compare(password, gebruiker.wachtwoord_hash);
  } catch (err) {
    return res.status(500).json({ error: 'Fout bij wachtwoordverificatie' });
  }

  if (!isGeldig) {
    return res.status(401).json({ error: 'Ongeldig wachtwoord' });
  }

  // Rollen ophalen uit gebruiker_rollen
  const { data: rollenData } = await supabase
    .from('gebruiker_rollen')
    .select('rol')
    .eq('gebruiker_id', gebruiker.id);

  const rollen = (rollenData || []).map(r => r.rol);
  const eersteRol = rollen.length > 0 ? rollen[0] : gebruiker.rol;

  const token = jwt.sign(
    { id: gebruiker.id, email: gebruiker.email, rol: eersteRol, rollen },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: gebruiker.id,
      naam: gebruiker.naam,
      voornaam: gebruiker.voornaam,
      achternaam: gebruiker.achternaam,
      email: gebruiker.email,
      rol: eersteRol,
      rollen
    }
  });
});

export default router;