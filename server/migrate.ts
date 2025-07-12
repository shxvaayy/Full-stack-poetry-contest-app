// migrate.ts
import { client, connectDatabase } from './db.js';
import { addProfilePictureColumn } from './add-profile-picture-column.js';
import { createTables } from './migrate.js';
import { migrateCouponTable } from './migrate-coupon-table.js';
import { createWinnerPhotosTable } from './migrate-winner-photos.js';
import { initializeAdminSettings } from './admin-settings.js';

async function runAllMigrations() {
  await createTables();
  await migrateCouponTable();
  await createWinnerPhotosTable(); // <-- Ensure winner_photos table is created
  await initializeAdminSettings();
  // ... any other migrations ...
}

// If this file is run directly, execute all migrations
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllMigrations()
    .then(() => {
      console.log('✅ All migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration error:', error);
      process.exit(1);
    });
}