// Local stand-in for Vercel's /api functions, wired to the Firebase
// emulators (no service account needed). Vite proxies /api here in dev.
//
//   npm run emulators   # terminal 1
//   npm run dev:api     # terminal 2
//   npm run dev:emu     # terminal 3, then open the URL Vite prints
import http from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.GCLOUD_PROJECT ||= 'demo-gymtrace';
// Local dev defaults. Override to test production behaviour, e.g.
//   PAYMENTS_SIMULATOR=off npm run dev:api
process.env.PAYMENTS_SIMULATOR ??= 'enabled';
process.env.QR_SIGNING_SECRET ??= 'local-dev-only-qr-secret-not-for-real-use-0123456789';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'api');
const port = Number(process.env.API_PORT || 3001);

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const match = /^\/api\/([a-z0-9-]+)$/.exec(pathname);
    const file = match && path.join(apiDir, `${match[1]}.js`);
    if (!file || !existsSync(file)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    const started = Date.now();
    const { default: handler } = await import(pathToFileURL(file).href);
    await handler(req, res);
    console.log(`${req.method} ${pathname} → ${res.statusCode} (${Date.now() - started} ms)`);
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`API on http://127.0.0.1:${port} (emulators: ${process.env.FIRESTORE_EMULATOR_HOST}, ${process.env.FIREBASE_AUTH_EMULATOR_HOST}; card simulator: ${process.env.PAYMENTS_SIMULATOR})`);
  });
