import { pool } from './db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration(): Promise<void> {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf-8');
    await client.query(sql);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
