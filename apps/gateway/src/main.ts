import 'dotenv/config';
import { AppContainer } from './bootstrap/AppContainer';
import { loadConfig } from './infrastructure/config/AppConfig';

async function main(): Promise<void> {
  const app = await AppContainer.create(loadConfig());
  await app.bot.start();
}

main().catch(error => { console.error('Gateway startup failed:', error); process.exitCode = 1; });
