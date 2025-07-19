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
            <a href="https://www.writoryofficial.com/submit" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 10px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              📝 Submit Your Poem
            </a>
            <a href="https://www.writoryofficial.com" 
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
              <a href="https://www.instagram.com/writoryofficial/" style="text-decoration: none; color: #e4405f;">
                <div style="background: #e4405f; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </div>
              </a>
              <a href="https://x.com/writoryofficial" style="text-decoration: none; color: #000000;">
                <div style="background: #000000; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X (Twitter)
                </div>
              </a>
              <a href="https://www.facebook.com/share/16hyCrZbE2/" style="text-decoration: none; color: #1877f2;">
                <div style="background: #1877f2; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </div>
              </a>
              <a href="https://www.linkedin.com/company/writoryofficial/" style="text-decoration: none; color: #0077b5;">
                <div style="background: #0077b5; color: white; padding: 12px 20px; border-radius: 25px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
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
              <a href="https://www.writoryofficial.com/contact" style="color: #667eea;">Contact Us</a> | 
              <a href="https://www.writoryofficial.com/privacy" style="color: #667eea;">Privacy Policy</a>
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