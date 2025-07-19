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

// FIXED: Match the interface that routes.ts is using
interface SubmissionEmailData {
  name: string;
  poemTitle: string;
  tier: string;
  submissionId: number;
}

export async function sendSubmissionConfirmation(email: string, data: SubmissionEmailData): Promise<boolean> {
  try {
    console.log('📧 Attempting to send confirmation email to:', email);
    console.log('📧 Email data:', data);

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address:', email);
      return false;
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
            Thank you for submitting your poem to the Writory Poetry Contest! We have successfully received your submission.
          </p>

          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📝 Submission Details:</h3>
            <p style="margin: 8px 0; color: #34495e;"><strong>Poem Title:</strong> ${data.poemTitle}</p>
            <p style="margin: 8px 0; color: #34495e;"><strong>Tier:</strong> ${getTierDisplayName(data.tier)}</p>
            <p style="margin: 8px 0; color: #34495e;"><strong>Submission ID:</strong> ${data.submissionId}</p>
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
      to: email,
      subject: `🎉 Poem Submission Confirmed - Writory Contest`,
      html: emailContent,
    };

    console.log('📤 Sending email with options:', { to: email, subject: mailOptions.subject });

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent successfully to:', email);
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

// Welcome email for new users
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  try {
    console.log('📧 Sending welcome email to:', email);

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address:', email);
      return false;
    }

    const emailContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="background-color: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700;">🎉 Welcome to Writory!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">You're now part of our creative family</p>
            </div>
          </div>

          <!-- Greeting -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2c3e50; font-size: 24px; margin-bottom: 15px;">Hello ${name}! 👋</h2>
            <p style="color: #34495e; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
              Welcome to the <strong>Writory Poetry Contest</strong>! We're thrilled to have you join our community of passionate poets and creative minds.
            </p>
          </div>

          <!-- What's Next Section -->
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="color: #2c3e50; font-size: 20px; margin-bottom: 20px; text-align: center;">🚀 What's Next?</h3>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">1</div>
                <div>
                  <h4 style="color: #2c3e50; margin: 0 0 5px 0;">Submit Your Poem</h4>
                  <p style="color: #6c757d; margin: 0; font-size: 14px;">Start with our free tier and share your creativity with the world</p>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">2</div>
                <div>
                  <h4 style="color: #2c3e50; margin: 0 0 5px 0;">Join Our Community</h4>
                  <p style="color: #6c757d; margin: 0; font-size: 14px;">Connect with fellow poets and stay updated on contest news</p>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">3</div>
                <div>
                  <h4 style="color: #2c3e50; margin: 0 0 5px 0;">Win Amazing Prizes</h4>
                  <p style="color: #6c757d; margin: 0; font-size: 14px;">Compete for recognition and exclusive rewards</p>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://writory.vercel.app'}/submit" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 10px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              📝 Submit Your Poem
            </a>
            <a href="${process.env.FRONTEND_URL || 'https://writory.vercel.app'}" 
               style="display: inline-block; background: #f8f9fa; color: #667eea; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 10px; border: 2px solid #667eea;">
              🏠 Visit Writory
            </a>
          </div>

          <!-- Social Media Section -->
          <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="color: #2c3e50; font-size: 20px; margin-bottom: 20px; text-align: center;">📱 Follow Us on Social Media</h3>
            <p style="color: #6c757d; text-align: center; margin-bottom: 20px; font-size: 14px;">
              Stay connected with our community and get the latest updates!
            </p>
            
            <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
              <a href="https://instagram.com/writory" style="text-decoration: none; color: #e4405f;">
                <div style="background: #e4405f; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  📸 Instagram
                </div>
              </a>
              <a href="https://twitter.com/writory" style="text-decoration: none; color: #1da1f2;">
                <div style="background: #1da1f2; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  🐦 Twitter
                </div>
              </a>
              <a href="https://facebook.com/writory" style="text-decoration: none; color: #1877f2;">
                <div style="background: #1877f2; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  📘 Facebook
                </div>
              </a>
            </div>
          </div>

          <!-- Contest Info -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; text-align: center;">🏆 Monthly Poetry Contest</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
              <div>
                <h4 style="margin: 0 0 5px 0; font-size: 16px;">Free Entry</h4>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">1 poem per month</p>
              </div>
              <div>
                <h4 style="margin: 0 0 5px 0; font-size: 16px;">Premium Tiers</h4>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Submit multiple poems</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">
              <strong>Writory Poetry Contest</strong> - Where creativity meets opportunity
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              © 2025 Writory. All rights reserved. | 
              <a href="${process.env.FRONTEND_URL || 'https://writory.vercel.app'}/contact" style="color: #667eea;">Contact Us</a> | 
              <a href="${process.env.FRONTEND_URL || 'https://writory.vercel.app'}/privacy" style="color: #667eea;">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Writory Poetry Contest" <${EMAIL_USER}>`,
      to: email,
      subject: `🎉 Welcome to Writory - Your Creative Journey Begins!`,
      html: emailContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully to:', email);
    console.log('✅ Message ID:', result.messageId);
    return true;

  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error.message);
    console.error('❌ Full error details:', error);
    return false;
  }
}

// FIXED: Multiple poems confirmation function
export async function sendMultiplePoemsConfirmation(email: string, data: {
  name: string;
  poemTitles: string[];
  tier: string;
  submissionUuid: string;
}): Promise<boolean> {
  try {
    console.log('📧 Sending multiple poems confirmation email to:', email);
    console.log('📊 Poem data:', { count: data.poemTitles.length, titles: data.poemTitles });

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address:', email);
      return false;
    }

    const poemTitlesDisplay = data.poemTitles
      .filter(title => title && title.trim().length > 0)
      .map((title, index) => `<li style="margin: 5px 0; color: #34495e;">${index + 1}. ${title}</li>`)
      .join('');

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0;">🎉 Multiple Poems Submitted!</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">WRITORY POETRY CONTEST</p>
          </div>

          <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
            Dear <strong>${data.name}</strong>,
          </p>

          <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
            Thank you for submitting your poems to the Writory Poetry Contest! We have successfully received all ${data.poemTitles.length} of your submissions.
          </p>

          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📝 Submission Details:</h3>
            <p style="margin: 8px 0; color: #34495e;"><strong>Tier:</strong> ${getTierDisplayName(data.tier)}</p>
            <p style="margin: 8px 0; color: #34495e;"><strong>Number of Poems:</strong> ${data.poemTitles.length}</p>
            <div style="margin: 8px 0; color: #34495e;">
              <strong>Poems Submitted:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">${poemTitlesDisplay}</ul>
            </div>
            <p style="margin: 8px 0; color: #34495e;"><strong>Submission ID:</strong> ${data.submissionUuid}</p>
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
      to: email,
      subject: `🎉 ${data.poemTitles.length} Poems Submitted - Writory Contest`,
      html: emailContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Multiple poems confirmation email sent successfully to:', email);
    console.log('✅ Message ID:', result.messageId);
    return true;

  } catch (error: any) {
    console.error('❌ Error sending multiple poems confirmation:', error);
    return false;
  }
}

export default { sendSubmissionConfirmation, sendMultiplePoemsConfirmation };