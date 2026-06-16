import { createNotification } from '../services/notificationService.js'

router.put(
  '/studenten/:stageId/voorstel-status',
  requireAuth,
  requireDocent,
  async (req, res) => {
    const supabase = req.app.get('supabase')
    const stageId = parseInt(req.params.stageId, 10)
    const { status, feedback } = req.body

    const geldigeStatussen = [
      'stagevoorstel ingediend',
      'stagevoorstel geaccepteerd',
      'stagevoorstel geweigerd',
      'stagevoorstel aanpassingen vereist'
    ]

    if (!geldigeStatussen.includes(status)) {
      return res.status(400).json({ error: 'Ongeldige status' })
    }

    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .select('id, student_id, stagevoorstel_id, stagementor_id')
      .eq('id', stageId)
      .maybeSingle()

    if (stageError || !stage) {
      return res.status(404).json({ error: 'Stage niet gevonden' })
    }

    const { error: statusError } = await supabase
      .from('stages')
      .update({ status })
      .eq('id', stageId)

    if (statusError) {
      console.error(statusError)
      return res.status(500).json({ error: 'Kon status niet opslaan' })
    }

    if (stage.stagevoorstel_id) {
      const { error: feedbackError } = await supabase
        .from('stagevoorstellen')
        .update({
          feedback:
            status === 'stagevoorstel aanpassingen vereist' ? feedback : null
        })
        .eq('id', stage.stagevoorstel_id)

      if (feedbackError) {
        console.error(feedbackError)
        return res.status(500).json({ error: 'Kon feedback niet opslaan' })
      }
    }

    if (status === 'stagevoorstel geaccepteerd') {
      try {
        const { data: student } = await supabase
          .from('gebruikers')
          .select('id, voornaam, achternaam')
          .eq('id', stage.student_id)
          .maybeSingle()

        const { data: stagevoorstel } = await supabase
          .from('stagevoorstellen')
          .select('bedrijfsnaam')
          .eq('id', stage.stagevoorstel_id)
          .maybeSingle()

        if (student && stagevoorstel) {
          const studentNaam = `${student.voornaam} ${student.achternaam}`
          const bedrijf = stagevoorstel.bedrijfsnaam

          await createNotification(
            req.user.id,
            student.id,
            studentNaam,
            bedrijf,
            'stage_aanvaard'
          )
        }
      } catch (error) {
        console.error('Fout bij aanmaken notificatie:', error)
      }
    }

    res.json({ success: true })

    if (status === 'stagevoorstel geaccepteerd' && stage.stagementor_id) {
      const { error: mentorError } = await supabase
        .from('gebruikers')
        .update({ actief: true })
        .eq('id', stage.stagementor_id)

      if (mentorError) {
        console.error(mentorError)
        return res.status(500).json({
          error: 'Stagevoorstel goedgekeurd, maar mentor kon niet geactiveerd worden'
        })
      }
    }
  }
);

export default router;
