import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
  }

  // Supabase client halen uit de app (zodat we geen dubbele client maken)
  const supabase = req.app.get('supabase');

  // Gebruiker ophalen uit database
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

  // Wachtwoord vergelijken (simpel, geen hash voor nu)
  if (password !== gebruiker.wachtwoord_hash) {
    return res.status(401).json({ error: 'Ongeldig wachtwoord' });
  }

  // JWT token aanmaken
  const token = jwt.sign(
    { id: gebruiker.id, email: gebruiker.email, rol: gebruiker.rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: gebruiker.id,
      naam: gebruiker.naam,
      voornaam: gebruiker.voornaam,
      email: gebruiker.email,
      rol: gebruiker.rol
    }
  });
});

export default router;