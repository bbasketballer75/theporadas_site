// Lightweight optional dotenv loader.
// Loaded by scripts needing secrets. No-op if dotenv not installed.
// Skips when SKIP_DOTENV=1 for performance or CI environments that inject vars already.
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

if (!process.env.SKIP_DOTENV) {
  const dotenvPath = resolve('.env');
  if (existsSync(dotenvPath)) {
    try {
      const mod = await import('dotenv');
      mod.config({ path: dotenvPath });
    } catch {
      // Fallback minimal parser (very limited) so local dev still works w/o dependency
      try {
        const raw = readFileSync(dotenvPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          if (!line || line.trim().startsWith('#')) continue;
          const eq = line.indexOf('=');
          if (eq === -1) continue;
          const key = line.slice(0, eq).trim();
          if (process.env[key] !== undefined) continue;
          const value = line.slice(eq + 1).trim();
          process.env[key] = value;
        }
        console.warn(
          '[env] Loaded minimally without dotenv (install devDependency for full support).',
        );
      } catch (err) {
        console.warn('[env] Failed to load .env file:', err.message || err);
      }
    }
  }
}
