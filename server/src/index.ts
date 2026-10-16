/**
 * SlotShield — Express server entry point
 */
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ─────────────────────────────────────────────────────
app.use(cors());
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
app.listen(PORT, () => {
  console.log(`\n  SlotShield API listening on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/v1/health\n`);
});
