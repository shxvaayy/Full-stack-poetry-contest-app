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

interface SubmissionConfirmationData {
  name: string;
  email: string;
  poemTitle: string;
  tier?: string;
}

export async function sendSubmissionConfirmation(data: SubmissionConfirmationData): Promise<boolean> {
  try {
    console.log('📧 Attempting to send confirmation email to:', data.email);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Poem Submission Confirmation</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #4CAF50;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #4CAF50;
                margin-bottom: 10px;
            }
            .tagline {
                color: #666;
                font-style: italic;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #f0f8ff;
                padding: 15px;
                border-left: 4px solid #4CAF50;
                margin: 20px 0;
                border-radius: 5px;
            }
            .poem-title {
                font-weight: bold;
                color: #4CAF50;
                font-size: 18px;
            }
            .contact-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-top: 30px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .tier-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                margin-left: 8px;
            }
            .tier-free { background-color: #e8f5e8; color: #2e7d32; }
            .tier-single { background-color: #e3f2fd; color: #1976d2; }
            .tier-double { background-color: #f3e5f5; color: #7b1fa2; }
            .tier-bulk { background-color: #fff3e0; color: #f57c00; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">WRITORY</div>
                <div class="tagline">Write Your Own Victory</div>
            </div>
            
            <div class="content">
                <h2 style="color: #4CAF50;">🎉 Submission Confirmed!</h2>
                
                <p>Dear <strong>${data.name}</strong>,</p>
                
                <p>Thank you for participating in the <strong>Writory Poetry Contest</strong>! We are delighted to confirm that we have successfully received your poem submission.</p>
                
                <div class="highlight">
                    <h3>📝 Submission Details:</h3>
                    <p><strong>Poem Title:</strong> <span class="poem-title">"${data.poemTitle}"</span></p>
                    <p><strong>Participant:</strong> ${data.name}</p>
                    <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    ${data.tier ? `<p><strong>Entry Type:</strong> ${getTierDisplayName(data.tier)} <span class="tier-badge tier-${data.tier}">${data.tier}</span></p>` : ''}
                </div>
                
                <h3>🔍 What's Next?</h3>
                <p>Your poem is now under review by our panel of expert judges. Here's what you can expect:</p>
                <ul>
                    <li>✅ Your submission has been safely received and stored</li>
                    <li>📋 Our judges will carefully review your work</li>
                    <li>🏆 Results will be announced according to our contest timeline</li>
                    <li>📧 You'll receive updates via email about the contest progress</li>
                    <li>🌟 Winners will be contacted directly for prize distribution</li>
                </ul>
                
                <p>We appreciate your creativity and participation in celebrating the art of poetry. Your words have the power to inspire, and we're honored to be part of your literary journey.</p>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold;">
                        📌 <strong>Important:</strong> Please save this email as your submission receipt. 
                        If you have any questions about your submission, please quote your poem title when contacting us.
                    </p>
                </div>
            </div>
            
            <div class="contact-info">
                <h3>📞 Need Help?</h3>
                <p>If you have any questions or concerns about your submission, please don't hesitate to reach out:</p>
                <p>
                    <strong>📧 Email:</strong> <a href="mailto:writorycontest@gmail.com" style="color: #4CAF50;">writorycontest@gmail.com</a><br>
                    <strong>📱 WhatsApp:</strong> 
                    <a href="https://wa.me/919667102405" style="color: #25D366;">9667102405</a> | 
                    <a href="https://wa.me/919818691695" style="color: #25D366;">9818691695</a>
                </p>
                <p><em>We typically respond within 24 hours.</em></p>
            </div>
            
            <div class="footer">
                <p><strong>Best wishes for your literary journey,</strong></p>
                <p><strong>Team Writory</strong></p>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                    This is an automated confirmation email. Please do not reply directly to this message.<br>
                    For support, please use the contact information provided above.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: {
        name: 'Team Writory',
        address: EMAIL_USER,
      },
      to: data.email,
      subject: 'Poem Submission Confirmation - Writory Poetry Contest',
      html: htmlContent,
      replyTo: 'writorycontest@gmail.com', // Set reply-to address
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