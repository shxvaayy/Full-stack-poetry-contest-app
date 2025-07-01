import nodemailer from 'nodemailer';

// Email configuration using environment variables
const EMAIL_USER = process.env.EMAIL_USER || 'writorycontest@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ertdwlvfjtraptqw';

console.log('📧 Email Configuration:');
console.log('- Email User:', EMAIL_USER);
console.log('- Email Pass exists:', !!EMAIL_PASS);
console.log('- Email Pass length:', EMAIL_PASS.length);

// Create transporter for Gmail with improved configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS.replace(/\s/g, ''), // Remove any spaces from app password
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
    console.error('❌ Full error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

export async function sendSubmissionConfirmation(data: {
  name: string;
  email: string;
  poemTitle: string;
  tier: string;
  poemCount?: number;
}): Promise<boolean> {
  try {
    console.log('📧 Attempting to send confirmation email to:', data.email);

    const poemCountText = data.poemCount && data.poemCount > 1 ? ` (${data.poemCount} poems)` : '';

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0;">🎉 Submission Confirmed!</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">WRITORY POETRY CONTEST</p>
          </div>

          <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
            Dear <strong>${data.name}</strong>,
          </p>

          <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
            Thank you for submitting your ${data.poemCount && data.poemCount > 1 ? 'poems' : 'poem'} to the Writory Poetry Contest! We have successfully received your submission${data.poemCount && data.poemCount > 1 ? 's' : ''}.
          </p>

          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📝 Submission Details:</h3>
            <p style="margin: 8px 0; color: #34495e;"><strong>Poem${data.poemCount && data.poemCount > 1 ? 's' : ''}:</strong> ${data.poemTitle}</p>
            <p style="margin: 8px 0; color: #34495e;"><strong>Tier:</strong> ${data.tier}${poemCountText}</p>
            <p style="margin: 8px 0; color: #34495e;"><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
            ${data.poemCount && data.poemCount > 1 ? `<p style="margin: 8px 0; color: #34495e;"><strong>Note:</strong> Each poem will be judged independently for maximum fairness.</p>` : ''}
          </div>

          <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
            We appreciate your participation and wish you the best of luck in the contest!
          </p>

          <p style="color: #7f8c8d; font-size: 14px;">
            Best regards,<br>The Writory Team
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: {
        name: 'Team Writory',
        address: EMAIL_USER,
      },
      to: data.email,
      subject: 'Poem Submission Confirmation - Writory Poetry Contest',
      html: emailContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent successfully to:', data.email);
    console.log('✅ Message ID:', result.messageId);
    return true;

  } catch (error: any) {
    console.error('❌ Error sending confirmation email:', error.message);
    console.error('❌ Full error details:', error);
    return false;
  }
}

// Helper function to get tier display name
function getTierDisplayName(tier: string): string {
  const tierNames = {
    'free': 'Free Entry',
    'single': '1 Poem Tier',
    'double': '2 Poems Tier',
    'bulk': '5 Poems Tier'
  };
  return tierNames[tier as keyof typeof tierNames] || tier;
}

export default { sendSubmissionConfirmation };