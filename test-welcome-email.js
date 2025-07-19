import { sendWelcomeEmail } from './server/mailSender.js';

async function testWelcomeEmail() {
  try {
    console.log('📧 Sending demo welcome email...');
    
    // Replace with your email address
    const testEmail = 'your-email@gmail.com'; // TODO: Update this to your actual email
    
    const result = await sendWelcomeEmail(testEmail, 'Shivay');
    
    if (result) {
      console.log('✅ Demo welcome email sent successfully!');
      console.log('📧 Check your email inbox for the beautiful welcome message');
    } else {
      console.log('❌ Failed to send demo email');
    }
  } catch (error) {
    console.error('❌ Error sending demo email:', error);
  }
}

testWelcomeEmail(); 