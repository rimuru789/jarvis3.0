/**
 * SlotShield — API v1 routes
 * All HTTP routes use the versioned /api/v1 prefix.
 * Route names follow STITCH_API_INTEGRATION_BLUEPRINT.md.
 */
import { Router, type Request, type Response } from 'express';
import { getBootstrapData } from '../data/loader.js';
import { initStore, listTimetables, getTimetable } from '../data/store.js';

const router = Router();

// Initialize the store with sample data on first import
initStore();

// ─── GET /api/v1/health ─────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ─── GET /api/v1/bootstrap ──────────────────────────────────────────
router.get('/bootstrap', (_req: Request, res: Response) => {
  try {
    const data = getBootstrapData();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load bootstrap data';
    res.status(500).json({
      error: {
        code: 'DATA_LOAD_ERROR',
        message,
        details: [],
      },
    });
  }
});

// ─── GET /api/v1/timetables ─────────────────────────────────────────
router.get('/timetables', (_req: Request, res: Response) => {
  try {
    const list = listTimetables();
    res.json({ timetables: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list timetables';
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message,
        details: [],
      },
    });
  }
});

// ─── GET /api/v1/timetables/:timetableId ────────────────────────────
router.get('/timetables/:timetableId', (req: Request, res: Response) => {
  const { timetableId } = req.params;
  const timetable = getTimetable(timetableId);

  if (!timetable) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Timetable "${timetableId}" not found.`,
        details: [],
      },
    });
    return;
  }

  res.json(timetable);
});

export default router;
