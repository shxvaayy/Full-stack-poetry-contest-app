
import { connectDatabase, client } from './db.js';

async function fixUserSubmissions() {
  try {
    console.log('🔧 Fixing user-submission links...');
    
    await connectDatabase();
    
    // Get all submissions that don't have a user_id but have email addresses
    const unlinkedSubmissions = await client.query(`
      SELECT id, email, first_name, last_name 
      FROM submissions 
      WHERE user_id IS NULL AND email IS NOT NULL
      ORDER BY submitted_at DESC
    `);
    
    console.log(`Found ${unlinkedSubmissions.rows.length} unlinked submissions`);
    
    let linked = 0;
    
    for (const submission of unlinkedSubmissions.rows) {
      // Try to find a user with this email
      const userResult = await client.query(`
        SELECT id, email FROM users WHERE email = $1
      `, [submission.email]);
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        
        // Link the submission to this user
        await client.query(`
          UPDATE submissions 
          SET user_id = $1 
          WHERE id = $2
        `, [user.id, submission.id]);
        
        console.log(`✅ Linked submission ${submission.id} to user ${user.email}`);
        linked++;
      } else {
        console.log(`⚠️ No user found for email: ${submission.email}`);
      }
    }
    
    console.log(`🎉 Successfully linked ${linked} submissions to users!`);
    
    // Show summary
    const totalLinked = await client.query(`
      SELECT COUNT(*) FROM submissions WHERE user_id IS NOT NULL
    `);
    
    const totalUnlinked = await client.query(`
      SELECT COUNT(*) FROM submissions WHERE user_id IS NULL
    `);
    
    console.log(`📊 Summary:`);
    console.log(`- Submissions linked to users: ${totalLinked.rows[0].count}`);
    console.log(`- Submissions without user links: ${totalUnlinked.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error fixing user submissions:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixUserSubmissions().catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
}

export { fixUserSubmissions };
