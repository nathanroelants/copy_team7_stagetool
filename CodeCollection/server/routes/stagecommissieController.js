export const acceptStageByCommission = async (req, res) => {
  try {
    const { stageId, studentId, docentEmail } = req.body;
    const supabase = req.app.get('supabase');

    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .update({ status: 'geaccepteerd' })
      .eq('id', stageId)
      .select();

    if (stageError) throw stageError;

    const { data: student } = await supabase
      .from('students')
      .select('email, password')
      .eq('id', studentId)
      .single();

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
        html: `
          <h2>Stage Aanvaard!</h2>
          <p>Inloggegevens student:</p>
          <p><strong>Email:</strong> ${student.email}</p>
          <p><strong>Wachtwoord:</strong> ${student.password}</p>
        `,
      }),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
