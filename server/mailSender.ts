import nodemailer from 'nodemailer';

// Email configuration using environment variables
const EMAIL_USER = process.env.EMAIL_USER || 'writorycontest@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ertdwlvfjtraptqw';

console.log('📧 Email Configuration:');
console.log('- Email User:', EMAIL_USER);
console.log('- Email Pass exists:', !!EMAIL_PASS);
console.log('- Email Pass length:', EMAIL_PASS.length);

// Create transporter for Gmail with improved configuration
const transporter = nodemailer.createTransporter({
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

// ✅ UPDATED: Interface for multiple poems submission
interface PoemSubmissionData {
  name: string;
  email: string;
  poemTitle: string;
  tier: string;
  poemCount?: number;
  allPoemTitles?: string[]; // NEW: Array of all poem titles
}

export async function sendSubmissionConfirmation(data: PoemSubmissionData): Promise<boolean> {
  try {
    console.log('📧 Attempting to send confirmation email to:', data.email);

    const poemCount = data.poemCount || 1;
    const isMultiplePoems = poemCount > 1;
    
    // ✅ NEW: Handle multiple poem titles display
    let poemTitlesDisplay = '';
    if (data.allPoemTitles && data.allPoemTitles.length > 1) {
      poemTitlesDisplay = data.allPoemTitles
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
            ${isMultiplePoems ? `
            <div style="background-color: #d5f4e6; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0; color: #27ae60; font-size: 14px;">
                <strong>📌 Important:</strong> Each of your ${poemCount} poems will be judged independently to maximize your chances of winning. This gives you ${poemCount} separate opportunities to compete!
              </p>
            </div>
            ` : ''}
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">🏆 What's Next?</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>Our AI judges will evaluate your ${isMultiplePoems ? 'poems' : 'poem'} based on creativity, emotion, structure, and language</li>
              <li>Results will be announced on our website and social media</li>
              <li>Winners will be contacted directly via email</li>
              ${isMultiplePoems ? '<li>Remember: Each poem competes individually, increasing your winning opportunities!</li>' : ''}
            </ul>
          </div>

          <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
            We appreciate your participation and wish you the best of luck in the contest${isMultiplePoems ? ' with all your poems' : ''}!
          </p>

          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="color: #6c757d; margin: 0; font-size: 14px;">
              Follow us for updates and results:<br>
              <a href="#" style="color: #6f42c1; text-decoration: none;">Website</a> | 
              <a href="#" style="color: #6f42c1; text-decoration: none;">Instagram</a> | 
              <a href="#" style="color: #6f42c1; text-decoration: none;">Twitter</a>
            </p>
          </div>

          <p style="color: #7f8c8d; font-size: 14px;">
            Best regards,<br>The Writory Team
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #adb5bd; font-size: 12px; text-align: center;">
            This is an automated confirmation email. Please do not reply to this message.
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
      subject: `${isMultiplePoems ? 'Poems' : 'Poem'} Submission Confirmation - Writory Poetry Contest`,
      html: emailContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent successfully to:', data.email);
    console.log('✅ Message ID:', result.messageId);
    console.log(`✅ Email sent for ${poemCount} poem${isMultiplePoems ? 's' : ''}`);
    return true;

  } catch (error: any) {
    console.error('❌ Error sending confirmation email:', error.message);
    console.error('❌ Full error details:', error);
    return false;
  }
}

// ✅ UPDATED: Helper function to get tier display name
function getTierDisplayName(tier: string): string {
  const tierNames = {
    'free': 'Free Entry (1 poem)',
    'single': '1 Poem Tier',
    'double': '2 Poems Tier',
    'bulk': '5 Poems Tier'
  };
  return tierNames[tier as keyof typeof tierNames] || tier;
}

// ✅ NEW: Send notification for multiple poems
export async function sendMultiplePoemsConfirmation(data: {
  name: string;
  email: string;
  tier: string;
  poems: Array<{ title: string; index: number; }>;
}): Promise<boolean> {
  const poemTitles = data.poems.map(p => p.title);
  
  return await sendSubmissionConfirmation({
    name: data.name,
    email: data.email,
    poemTitle: poemTitles[0] || 'Multiple Poems', // Fallback
    tier: data.tier,
    poemCount: data.poems.length,
    allPoemTitles: poemTitles
  });
}

export default { sendSubmissionConfirmation, sendMultiplePoemsConfirmation };