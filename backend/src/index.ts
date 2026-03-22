import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { testConnection } from './config/db';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function start(): Promise<void> {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Zikki API running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
