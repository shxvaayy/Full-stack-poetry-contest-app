import nodemailer from 'nodemailer';

// Email configuration using environment variables
const EMAIL_USER = process.env.EMAIL_USER || 'writorycontest@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ertdwlvfjtraptqw';

console.log('📧 Email Configuration:');
console.log('- Email User:', EMAIL_USER);
console.log('- Email Pass exists:', !!EMAIL_PASS);
console.log('- Email Pass length:', EMAIL_PASS.length);

// ✅ FIXED: Changed createTransporter to createTransport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS.replace(/\s/g, ''),
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

interface PoemSubmissionData {
  name: string;
  email: string;
  poemTitle: string;
  tier: string;
  poemCount?: number;
  allPoemTitles?: string[];
}

export async function sendSubmissionConfirmation(data: PoemSubmissionData): Promise<boolean> {
  try {
    console.log('📧 Attempting to send confirmation email to:', data.email);

    const poemCount = data.poemCount || 1;
    const isMultiplePoems = poemCount > 1;
    
    // Handle multiple poem titles display
    let poemTitlesDisplay = '';
    if (data.allPoemTitles && data.allPoemTitles.length > 1) {
      poemTitlesDisplay = data.allPoemTitles
        .filter(title => title && title.trim().length > 0)
        .map((title, index) => `<li style="margin: 5px 0; color: #34495e;">${index + 1}. ${title}</li>`)
        .join('');
      poemTitlesDisplay = `<ul style="margin: 10px 0; padding-left: 20px;">${poemTitlesDisplay}</ul>`;
    } else {
      poemTitlesDisplay = `<p style="margin: 8px 0; color: #34495e;">${data.poemTitle}</p>`;
    }

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
            Thank you for submitting your ${isMultiplePoems ? 'poems' : 'poem'} to the Writory Poetry Contest! We have successfully received your submission${isMultiplePoems ? 's' : ''}.
          </p>

          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📝 Submission Details:</h3>
            <p style="margin: 8px 0; color: #34495e;"><strong>Tier:</strong> ${getTierDisplayName(data.tier)}</p>
            <p style="margin: 8px 0; color: #34495e;"><strong>Number of Poems:</strong> ${poemCount}</p>
            <div style="margin: 8px 0; color: #34495e;">
              <strong>Poem${isMultiplePoems ? 's' : ''} Submitted:</strong>
              ${poemTitlesDisplay}
            </div>
            <p style="margin: 8px 0; color: #34495e;"><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
              Best of luck in the contest! 🍀
            </p>
          </div>

          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              © 2025 Writory Poetry Contest. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Writory Poetry Contest" <${EMAIL_USER}>`,
      to: data.email,
      subject: `🎉 ${isMultiplePoems ? 'Poems' : 'Poem'} Submission Confirmed - Writory Contest`,
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

function getTierDisplayName(tier: string): string {
  const tierNames = {
    'free': 'Free Entry (1 poem)',
    'single': '1 Poem Tier',
    'double': '2 Poems Tier',
    'bulk': '5 Poems Tier'
  };
  return tierNames[tier as keyof typeof tierNames] || tier;
}

export async function sendMultiplePoemsConfirmation(data: {
  name: string;
  email: string;
  tier: string;
  poemCount: number;
  allPoemTitles: string[];
}): Promise<boolean> {
  try {
    console.log('📧 Sending multiple poems confirmation email to:', data.email);
    console.log('📊 Poem data:', { count: data.poemCount, titles: data.allPoemTitles });

    const validTitles = data.allPoemTitles.filter(title => title && title.trim().length > 0);

    return await sendSubmissionConfirmation({
      name: data.name,
      email: data.email,
      poemTitle: validTitles[0] || 'Multiple Poems',
      tier: data.tier,
      poemCount: data.poemCount,
      allPoemTitles: validTitles
    });
  } catch (error) {
    console.error('❌ Error sending multiple poems confirmation:', error);
    return false;
  }
}

export default { sendSubmissionConfirmation, sendMultiplePoemsConfirmation };