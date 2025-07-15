// migrate.ts
import { client, connectDatabase } from './db.js';
import { addProfilePictureColumn } from './add-profile-picture-column.js';
import { migrateCouponTable } from './migrate-coupon-table.js';
import { createWinnerPhotosTable } from './migrate-winner-photos.js';
import { initializeAdminSettings } from './admin-settings.js';
import { addInstagramHandleColumn } from './migrate-instagram-handle';

async function runAllMigrations() {
  await addInstagramHandleColumn();
  await migrateCouponTable();
  await createWinnerPhotosTable(); // <-- Ensure winner_photos table is created
  await initializeAdminSettings();
  // ... any other migrations ...
}

// Run all migrations automatically on deploy
runAllMigrations().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});