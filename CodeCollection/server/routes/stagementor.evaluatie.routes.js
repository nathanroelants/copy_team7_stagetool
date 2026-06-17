// GET /api/stagementor/competenties
router.get('/competenties', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');

  const { data, error } = await supabase
    .from('competenties')
    .select('id, naam, beschrijving, volgorde')
    .eq('actief', true)
    .order('volgorde', { ascending: true });

  if (error) {
    console.error('Fout bij ophalen competenties:', error);
    return res.status(500).json({ error: 'Kon competenties niet ophalen' });
  }

  res.json(data);
});

// GET /api/stagementor/evaluaties/:stageId
router.get('/evaluaties/:stageId', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const stageId = parseInt(req.params.stageId, 10);

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, evaluatie_status, stagementor_id')
    .eq('id', stageId)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Stage niet gevonden' });
  }

  // Check of stagementor toegang heeft tot deze stage
  if (stage.stagementor_id !== req.user.id) {
    return res.status(403).json({ error: 'Geen toegang tot deze stage' });
  }

  const { data, error } = await supabase
    .from('evaluaties')
    .select('id, competentie_id, beoordelaar_id, type, score, feedback, zichtbaar_voor_student')
    .eq('stage_id', stageId);

  if (error) {
    console.error('Fout bij ophalen evaluaties:', error);
    return res.status(500).json({ error: 'Kon evaluaties niet ophalen' });
  }

  res.json({ evaluatie_status: stage.evaluatie_status, evaluaties: data });
});

// POST /api/stagementor/evaluaties/:stageId
router.post('/evaluaties/:stageId', requireAuth, requireStagementor, async (req, res) => {
  const supabase = req.app.get('supabase');
  const stageId = parseInt(req.params.stageId, 10);
  const mentorId = req.user.id;
  const { competentie_id, type, score, feedback } = req.body;

  if (!competentie_id || !type || !feedback) {
    return res.status(400).json({ error: 'competentie_id, type en feedback zijn verplicht' });
  }

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, evaluatie_status, stagementor_id')
    .eq('id', stageId)
    .single();

  if (stageError || !stage) {
    return res.status(404).json({ error: 'Stage niet gevonden' });
  }

  // Check of stagementor toegang heeft
  if (stage.stagementor_id !== mentorId) {
    return res.status(403).json({ error: 'Geen toegang tot deze stage' });
  }

  // Schrijftoegang bewaken
  const status = stage.evaluatie_status;
  const schrijfToegestaan =
    (type === 'tussentijds' && status === 'tussentijds') ||
    (type === 'eindevaluatie' && status === 'eindevaluatie');

  if (!schrijfToegestaan) {
    return res.status(403).json({ error: 'Opslaan is niet toegestaan in de huidige fase.' });
  }

  const { data: bestaande } = await supabase
    .from('evaluaties')
    .select('id')
    .eq('stage_id', stageId)
    .eq('competentie_id', competentie_id)
    .eq('beoordelaar_id', mentorId)
    .eq('type', type)
    .single();

  let result, error;

  if (bestaande) {
    ({ data: result, error } = await supabase
      .from('evaluaties')
      .update({ score, feedback, bijgewerkt_op: new Date() })
      .eq('id', bestaande.id)
      .select()
      .single());
  } else {
    ({ data: result, error } = await supabase
      .from('evaluaties')
      .insert({
        stage_id: stageId,
        competentie_id,
        beoordelaar_id: mentorId,
        type,
        score,
        feedback,
        zichtbaar_voor_student: true,  // Mentor evaluaties zijn zichtbaar voor student
      })
      .select()
      .single());
  }

  if (error) {
    console.error('Fout bij opslaan evaluatie:', error);
    return res.status(500).json({ error: 'Kon evaluatie niet opslaan' });
  }

  res.json(result);
});
