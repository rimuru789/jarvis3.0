/**
 * SlotShield — Express server entry point
 */
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';

// ─── Middleware ─────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

// Standard local development origins
const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function isOriginAllowed(origin: string): boolean {
  if (configuredOrigins.includes('*')) return true;
  if (configuredOrigins.includes(origin)) return true;
  // Also match if configured origin is a bare domain (e.g. host.onrender.com)
  const matchesDomain = configuredOrigins.some((c) => {
    const cleanConfig = c.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanOrigin = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return cleanConfig === cleanOrigin;
  });
  if (matchesDomain) return true;

  // In non-production, permit dev origins
  if (!isProduction && devOrigins.includes(origin)) {
    return true;
  }

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, Render health checks)
      if (!origin) return callback(null, true);

      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      // Reject non-allowed origins
      return callback(new Error(`CORS origin '${origin}' not allowed.`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 404 fallback ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found.',
      details: [],
    },
  });
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`\n  SlotShield API listening on http://${HOST}:${PORT}`);
  console.log(`  Health check: http://${HOST}:${PORT}/api/v1/health\n`);
});
