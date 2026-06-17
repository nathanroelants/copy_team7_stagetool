export const sendStageAcceptedNotification = async (req, res) => {
  try {
    const { studentId, docentEmail, studentEmail, studentPassword } = req.body;
    const supabase = req.app.get('supabase');

    // Email naar docent
    const docentEmailContent = `
      <h2>Stage Aanvaard!</h2>
      <p>De stagecommissie heeft de stage van uw student goedgekeurd.</p>
      
      <h3>Inloggegevens student:</h3>
      <p><strong>Email:</strong> ${studentEmail}</p>
      <p><strong>Wachtwoord:</strong> ${studentPassword}</p>
      
      <p>De student kan nu inloggen op het platform.</p>
    `;

    // Stuur email naar docent
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@stageplatform.nl',
        to: docentEmail,
        subject: 'Stage Aanvaard - Inloggegevens Student',
        html: docentEmailContent,
      }),
    });

    // Opslaan in database
    await supabase.from('notifications').insert({
      student_id: studentId,
      docent_email: docentEmail,
      type: 'stage_accepted',
      message: `Stage aanvaard. Inloggegevens: ${studentEmail}`,
      read: false,
    });

    res.json({ success: true, message: 'Notificatie verzonden' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
