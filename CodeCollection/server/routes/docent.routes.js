router.get('/studenten', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const docentId = req.user.id;

  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select(`
      id,
      status,
      start_datum,
      eind_datum,
      student:gebruikers!student_id (
        id,
        voornaam,
        achternaam,
        email
      ),
      stagevoorstel:stagevoorstellen!stagevoorstel_id (
        id,
        bedrijfsnaam
      )
    `)
    .eq('docent_id', docentId);

  if (stagesError) {
    console.error('Fout bij ophalen stages:', stagesError);
    return res.status(500).json({ error: 'Kon studenten niet ophalen' });
  }

  if (!stages || stages.length === 0) return res.json([]);

  const stageIds = stages.map(s => s.id);
  const studentIds = stages.map(s => s.student?.id).filter(Boolean);

  const { data: opleidingen } = await supabase
    .from('opleidingen')
    .select('gebruiker_id, naam')
    .in('gebruiker_id', studentIds.length > 0 ? studentIds : [0]);

  const opleidingPerStudent = {};
  for (const o of opleidingen || []) {
    opleidingPerStudent[o.gebruiker_id] = o.naam;
  }

  const { data: logboeken } = await supabase
    .from('logboeken')
    .select('stage_id, week_nummer, afgetekend, ingediend')
    .in('stage_id', stageIds)
    .order('week_nummer', { ascending: false });

  const logboekPerStage = {};
  for (const l of logboeken || []) {
    if (!logboekPerStage[l.stage_id]) {
      logboekPerStage[l.stage_id] = l;
    }
  }

  const result = stages.map(stage => {
    const logboek = logboekPerStage[stage.id];

    let logboekStatus = 'Niet ingediend';
    if (logboek) {
      logboekStatus = logboek.afgetekend
        ? `Week ${logboek.week_nummer} afgetekend`
        : `Week ${logboek.week_nummer} in afwachting`;
    }

    return {
      id:                   stage.id,
      voornaam:             stage.student?.voornaam   ?? '',
      achternaam:           stage.student?.achternaam ?? '',
      email:                stage.student?.email      ?? '',
      opleiding:            opleidingPerStudent[stage.student?.id] ?? '',
      bedrijf:              stage.stagevoorstel?.bedrijfsnaam ?? '',
      start_datum:          stage.start_datum,
      eind_datum:           stage.eind_datum,
      stagevoorstel_status: stage.status ?? 'Niet ingediend',
      logboek_status:       logboekStatus
    };
  });

  res.json(result);
});

// ── GET /api/docent/studenten/:stageId/logboek ────────────────────────────────
router.get('/studenten/:stageId/logboek', requireAuth, requireDocent, async (req, res) => {
  const supabase = req.app.get('supabase');
  const stageId = parseInt(req.params.stageId, 10);

  if (isNaN(stageId)) {
    return res.status(400).json({ error: 'Ongeldig stage-ID' });
  }

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select(`
      id,
      status,
      start_datum,
      eind_datum,
      student:gebruikers!student_id (
        id,
        voornaam,
        achternaam,
        email
      ),
      stagevoorstel:stagevoorstellen!stagevoorstel_id (
        id,
        bedrijfsnaam
      )
    `)
    .eq('id', stageId)
    .maybeSingle();

  if (stageError) {
    console.error('Fout bij ophalen stage:', stageError);
    return res.status(500).json({ error: 'Kon stage niet ophalen' });
  }

  if (!stage) {
    return res.status(404).json({ error: 'Stage niet gevonden' });
  }

  const { data: logboeken, error: logboekError } = await supabase
    .from('logboeken')
    .select(`
      id,
      week_nummer,
      afgetekend,
      ingediend,
      logboekdagen (
        id,
        datum,
        taak,
        uren,
        leerdoelstelling,
        reflectie,
        leerpunten
      )
    `)
    .eq('stage_id', stageId)
    .order('week_nummer', { ascending: true });

  if (logboekError) {
    console.error('Fout bij ophalen logboeken:', logboekError);
    return res.status(500).json({ error: 'Kon logboek niet ophalen' });
  }

  res.json({
    student: {
      naam:       `${stage.student?.voornaam ?? ''} ${stage.student?.achternaam ?? ''}`.trim(),
      email:      stage.student?.email ?? '',
      bedrijf:    stage.stagevoorstel?.bedrijfsnaam ?? '',
      startDatum: stage.start_datum,
      eindDatum:  stage.eind_datum
    },
    weken: (logboeken || []).map(l => ({
      nummer:  l.week_nummer,
      status:  l.afgetekend ? 'Afgetekend' : l.ingediend ? 'Ingediend' : 'Niet ingediend',
      dagen:   (l.logboekdagen || []).map(d => ({
        datum:       d.datum,
        taak:        d.taak,
        uren:        d.uren,
        los:         d.leerdoelstelling,
        reflectie:   d.reflectie,
        leerpunten:  d.leerpunten
      }))
    }))
  });
});