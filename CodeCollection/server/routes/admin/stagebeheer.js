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

const TOEGESTANE_STATUS = [
  'stagevoorstel ingediend',
  'stagevoorstel geaccepteerd',
  'stagevoorstel geweigerd',
  'stagevoorstel aanpassingen vereist',
  'lopend',
  'afgerond',
  'beëindigd'
];

// GET /api/admin/stages  — alle stages met student/docent/mentor + bedrijfsgegevens
router.get('/stages', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('stages')
    .select(`
      id, status, start_datum, eind_datum, evaluatie_status,
      student_id, docent_id, stagementor_id, stagevoorstel_id,
      student:gebruikers!stages_student_id_fkey ( id, voornaam, achternaam ),
      docent:gebruikers!stages_docent_begeleider_id_fkey ( id, voornaam, achternaam ),
      stagementor:gebruikers!stages_bedrijfsbegeleider_id_fkey ( id, voornaam, achternaam ),
      stagevoorstel:stagevoorstellen!stages_stagevoorstel_id_fkey (
        id, bedrijfsnaam, beschrijving, tools, technische_skills,
        straat, huisnummer, gemeente, land
      )
    `)
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// PUT /api/admin/stages/:id  — koppelingen, status, datums én bedrijfsgegevens bijwerken
router.put('/stages/:id', verifyAdmin, async (req, res) => {
  const supabase = req.app.get('supabase');
  const id = req.params.id;
  const {
    student_id, docent_id, stagementor_id, status, start_datum, eind_datum,
    bedrijfsnaam, beschrijving, tools, technische_skills,
    straat, huisnummer, gemeente, land
  } = req.body;

  if (status && !TOEGESTANE_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Ongeldige status' });
  }
  if (start_datum && eind_datum && new Date(eind_datum) < new Date(start_datum)) {
    return res.status(400).json({ error: 'Einddatum mag niet voor de startdatum liggen' });
  }

  // Huidige stage ophalen voor het gekoppelde stagevoorstel_id
  const { data: huidigeStage, error: ophaalError } = await supabase
    .from('stages')
    .select('id, stagevoorstel_id')
    .eq('id', id)
    .single();

  if (ophaalError || !huidigeStage) {
    return res.status(404).json({ error: 'Stage niet gevonden' });
  }

  // 1) stages-tabel bijwerken
  const stageUpdate = {};
  if (student_id !== undefined) stageUpdate.student_id = student_id;
  if (docent_id !== undefined) stageUpdate.docent_id = docent_id;
  if (stagementor_id !== undefined) stageUpdate.stagementor_id = stagementor_id;
  if (status !== undefined) stageUpdate.status = status;
  if (start_datum !== undefined) stageUpdate.start_datum = start_datum;
  if (eind_datum !== undefined) stageUpdate.eind_datum = eind_datum;

  if (Object.keys(stageUpdate).length > 0) {
    const { error: stageError } = await supabase
      .from('stages')
      .update(stageUpdate)
      .eq('id', id);

    if (stageError) {
      return res.status(500).json({ error: stageError.message });
    }
  }

  // 2) stagevoorstellen-tabel bijwerken (bedrijfsgegevens)
  const voorstelUpdate = {};
  if (bedrijfsnaam !== undefined) voorstelUpdate.bedrijfsnaam = bedrijfsnaam;
  if (beschrijving !== undefined) voorstelUpdate.beschrijving = beschrijving;
  if (tools !== undefined) voorstelUpdate.tools = tools;
  if (technische_skills !== undefined) voorstelUpdate.technische_skills = technische_skills;
  if (straat !== undefined) voorstelUpdate.straat = straat;
  if (huisnummer !== undefined) voorstelUpdate.huisnummer = huisnummer;
  if (gemeente !== undefined) voorstelUpdate.gemeente = gemeente;
  if (land !== undefined) voorstelUpdate.land = land;

  if (Object.keys(voorstelUpdate).length > 0) {
    const { error: voorstelError } = await supabase
      .from('stagevoorstellen')
      .update(voorstelUpdate)
      .eq('id', huidigeStage.stagevoorstel_id);

    if (voorstelError) {
      return res.status(500).json({ error: voorstelError.message });
    }
  }

  res.json({ success: true });
});

export default router;
