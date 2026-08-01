import { readFileSync } from 'fs';
import { ENV_FILE } from './global-setup';

const env: Record<string, string> = JSON.parse(readFileSync(ENV_FILE, 'utf8'));
for (const [key, value] of Object.entries(env)) {
  process.env[key] = value;
}
