import express from 'express';
import jwt from 'jsonwebtoken';

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
console.log('Studentstagevoorstellen routes geladen');

router.get('/test', (req, res) => {
  res.json({ ok: true });
});


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
      stagevoorstellen (*),
      stagementor:gebruikers!stages_bedrijfsbegeleider_id_fkey (voornaam, achternaam, email)
    `)
    .eq('student_id', req.user.id)
    .order('aangemaakt_op', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ─── GET /:stageId/detail ────────────────────────────────────────────────────
router.get('/:stageId/detail', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select(`
      id, status, start_datum, eind_datum,
      student_id, docent_id, stagementor_id, stagevoorstel_id,
      stagevoorstellen (*)
    `)
    .eq('id', stageId)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Stage niet gevonden' });
  }

  const { data: student } = await supabase
    .from('gebruikers')
    .select('voornaam, achternaam, email, opleiding')
    .eq('id', stage.student_id)
    .single();

  const { data: mentor } = await supabase
    .from('gebruikers')
    .select('voornaam, achternaam, email')
    .eq('id', stage.stagementor_id)
    .single();

  const { data: docent } = await supabase
    .from('gebruikers')
    .select('voornaam, achternaam, email')
    .eq('id', stage.docent_id)
    .single();

  const voorstel = stage.stagevoorstellen;
  const ondertekeningen = {
    student:     voorstel?.student_ondertekend ? voorstel.student_ondertekend_op : null,
    docent:      voorstel?.docent_ondertekend  ? voorstel.docent_ondertekend_op  : null,
    stagementor: voorstel?.mentor_ondertekend  ? voorstel.mentor_ondertekend_op  : null,
  };

  res.json({
    stage,
    stagevoorstel: voorstel,
    student:  student  || {},
    mentor:   mentor   || {},
    docent:   docent   || {},
    ondertekeningen,
  });
});

// ─── GET /:stageId/overeenkomst ───────────────────────────────────────────────
router.get('/:stageId/overeenkomst', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  const { data, error } = await supabase
    .from('stageovereenkomsten')
    .select('*')
    .eq('stage_id', stageId)
    .single();

  if (error || !data) return res.json({ overeenkomst: null });
  res.json({ overeenkomst: data });
});

// ─── GET /:stageId/overeenkomst/download ─────────────────────────────────────
router.get('/:stageId/overeenkomst/download', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  const { data: meta } = await supabase
    .from('stageovereenkomsten')
    .select('bestandspad, bestandsnaam')
    .eq('stage_id', stageId)
    .single();

  if (!meta) return res.status(404).json({ error: 'Geen overeenkomst gevonden.' });

  const { data, error } = await supabase.storage
    .from('stagebestanden')
    .download(meta.bestandspad);

  if (error) return res.status(500).json({ error: error.message });

  const buffer = Buffer.from(await data.arrayBuffer());
  res.setHeader('Content-Disposition', `attachment; filename="${meta.bestandsnaam}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(buffer);
});

// ─── POST /:stageId/overeenkomst (upload) ────────────────────────────────────
router.post('/:stageId/overeenkomst', verifyToken, upload.single('overeenkomst'), async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  try {
    // Debug logging
    console.log('Upload request received for stage:', stageId);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('File present:', !!req.file);
    
    // Check of bestand bestaat
    if (!req.file) {
      console.error('No file in request. Body keys:', Object.keys(req.body));
      return res.status(400).json({ error: 'Geen bestand ontvangen. Zorg dat het veld "overeenkomst" heet.' });
    }

    const file = req.file;
    
    // Valideer bestandsgrootte (bijv. max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return res.status(400).json({ error: 'Bestand is te groot. Maximaal 10MB toegestaan.' });
    }

    // Valideer bestandstype
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Alleen PDF, DOC en DOCX bestanden zijn toegestaan.' });
    }

    console.log(`Bestand ontvangen: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

    // Genereer uniek bestandspad
    const timestamp = Date.now();
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const bestandspad = `overeenkomsten/${stageId}/${timestamp}_${safeFilename}`;

    // Upload naar Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('stagebestanden')
      .upload(bestandspad, file.buffer, { 
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Fout bij uploaden naar storage: ' + uploadError.message });
    }

    // Opslaan in database
    const { error: dbError } = await supabase.from('stageovereenkomsten').upsert({
      stage_id: stageId,
      bestandspad,
      bestandsnaam: file.originalname,
      bestandsgrootte: file.size,
      mimetype: file.mimetype,
      upload_datum: new Date().toISOString(),
      geupload_door: req.user.id,
      geupload_door_rol: req.user.rol || 'student'
    }, { onConflict: 'stage_id' });

    if (dbError) {
      console.error('Database error:', dbError);
      // Probeer het geüploade bestand te verwijderen als de database insert faalt
      await supabase.storage.from('stagebestanden').remove([bestandspad]);
      return res.status(500).json({ error: 'Fout bij opslaan in database: ' + dbError.message });
    }

    console.log('Upload succesvol voor stage:', stageId);
    res.json({ 
      success: true, 
      message: 'Bestand succesvol geüpload',
      bestand: {
        naam: file.originalname,
        grootte: file.size,
        type: file.mimetype
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Interne server fout: ' + error.message });
  }
});

// ─── GET /:stageId/overeenkomst/download ─────────────────────────────────────
router.get('/:stageId/overeenkomst/download', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;

  const { data: meta } = await supabase
    .from('stageovereenkomsten')
    .select('bestandspad, bestandsnaam')
    .eq('stage_id', stageId)
    .single();

  if (!meta) return res.status(404).json({ error: 'Geen overeenkomst gevonden.' });

  const { data, error } = await supabase.storage
    .from('stagebestanden')
    .download(meta.bestandspad);

  if (error) return res.status(500).json({ error: error.message });

  const buffer = Buffer.from(await data.arrayBuffer());
  res.setHeader('Content-Disposition', `attachment; filename="${meta.bestandsnaam}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(buffer);
});

// POST /api/stagevoorstellen
router.post('/', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const {
    bedrijfsnaam, voornaam_stagementor, achternaam_stagementor, email_stagementor,
    stage_begin, stage_einde, beschrijving,
    technische_skills, tools, straat, huisnummer, gemeente, land
  } = req.body;

  if (!bedrijfsnaam || !stage_begin || !stage_einde || !beschrijving ||
      !voornaam_stagementor || !achternaam_stagementor || !email_stagementor || !straat || !gemeente) {
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
    const { data: nieuweMentor, error: mentorError } = await supabase
      .from('gebruikers')
      .insert([{
        voornaam: voornaam_stagementor,
        achternaam: achternaam_stagementor,
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

// DELETE /api/stagevoorstellen/:id - apaga voorstel recusado
router.delete('/:id', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const stageId = req.params.id;

  // Verifica que o stage pertence ao utilizador e está geweigerd
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

  if (stage.status !== 'stagevoorstel geweigerd') {
    return res.status(400).json({ error: 'Alleen geweigerde voorstellen kunnen verwijderd worden' });
  }

  // 1. Apagar a stage primeiro (filho)
  const { error: stageDelError } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);

  if (stageDelError) {
    return res.status(500).json({ error: stageDelError.message });
  }

  // 2. Apagar o stagevoorstel (pai)
  const { error: voorstelDelError } = await supabase
    .from('stagevoorstellen')
    .delete()
    .eq('id', stage.stagevoorstel_id);

  if (voorstelDelError) {
    return res.status(500).json({ error: voorstelDelError.message });
  }

  res.json({ success: true });
});
router.get('/mijn', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('stages')
    .select(`
      id, status, start_datum, eind_datum,
      docent_id, stagementor_id,
      stagevoorstellen (*),
      stagementor:gebruikers!stages_bedrijfsbegeleider_id_fkey (voornaam, achternaam, email)
    `)
    .eq('student_id', req.user.id)
    .order('aangemaakt_op', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ─── 2. POST / (nieuw voorstel) ──────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');

  const {
    bedrijfsnaam, voornaam_stagementor, achternaam_stagementor, email_stagementor,
    stage_begin, stage_einde, beschrijving,
    technische_skills, tools, straat, huisnummer, gemeente, land
  } = req.body;

  if (!bedrijfsnaam || !stage_begin || !stage_einde || !beschrijving ||
      !voornaam_stagementor || !achternaam_stagementor || !email_stagementor || !straat || !gemeente) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  let stagementorId;
  const { data: bestaandeMentor } = await supabase
    .from('gebruikers')
    .select('id')
    .eq('email', email_stagementor)
    .single();

  if (bestaandeMentor) {
    stagementorId = bestaandeMentor.id;
  } else {
    const { data: nieuweMentor, error: mentorError } = await supabase
      .from('gebruikers')
      .insert([{
        voornaam: voornaam_stagementor,
        achternaam: achternaam_stagementor,
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

// ─── 3. SIGNING ROUTES (specific, before /:id) ───────────────────────────────
router.post('/:stageId/ondertekenen/student', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;
  try {
    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .select('stagevoorstel_id')
      .eq('id', stageId)
      .single();

    if (stageError || !stage) throw new Error('Stage niet gevonden.');

    const { error } = await supabase
      .from('stagevoorstellen')
      .update({ student_ondertekend: true, student_ondertekend_op: new Date().toISOString() })
      .eq('id', stage.stagevoorstel_id);
    if (error) throw error;
    res.json({ message: 'Student ondertekening gelukt.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:stageId/ondertekenen/docent', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;
  try {
    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .select('stagevoorstel_id')
      .eq('id', stageId)
      .single();

    if (stageError || !stage) throw new Error('Stage niet gevonden.');

    const { error } = await supabase
      .from('stagevoorstellen')
      .update({ docent_ondertekend: true, docent_ondertekend_op: new Date().toISOString() })
      .eq('id', stage.stagevoorstel_id);
    if (error) throw error;
    res.json({ message: 'Docent ondertekening gelukt.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:stageId/ondertekenen/stagementor', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { stageId } = req.params;
  try {
    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .select('stagevoorstel_id')
      .eq('id', stageId)
      .single();

    if (stageError || !stage) throw new Error('Stage niet gevonden.');

    const { error } = await supabase
      .from('stagevoorstellen')
      .update({ mentor_ondertekend: true, mentor_ondertekend_op: new Date().toISOString() })
      .eq('id', stage.stagevoorstel_id);
    if (error) throw error;
    res.json({ message: 'Mentor ondertekening gelukt.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. PUT /:id ─────────────────────────────────────────────────────────────
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

// ─── 5. DELETE /:id ──────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  const supabase = req.app.get('supabase');
  const stageId = req.params.id;

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

  if (stage.status !== 'stagevoorstel geweigerd') {
    return res.status(400).json({ error: 'Alleen geweigerde voorstellen kunnen verwijderd worden' });
  }

  const { error: stageDelError } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);

  if (stageDelError) {
    return res.status(500).json({ error: stageDelError.message });
  }

  const { error: voorstelDelError } = await supabase
    .from('stagevoorstellen')
    .delete()
    .eq('id', stage.stagevoorstel_id);

  if (voorstelDelError) {
    return res.status(500).json({ error: voorstelDelError.message });
  }

  res.json({ success: true });
});



export default router;