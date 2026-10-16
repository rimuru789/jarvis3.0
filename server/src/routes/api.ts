/**
 * SlotShield — API v1 routes
 * All HTTP routes use the versioned /api/v1 prefix.
 * Route names follow STITCH_API_INTEGRATION_BLUEPRINT.md.
 */
import { Router, type Request, type Response } from 'express';
import {
  getBootstrapData,
  getCourses,
  getTeachers,
  getRooms,
  getTimeSlots,
  getSessions,
} from '../data/loader.js';
import {
  initStore,
  listTimetables,
  getTimetable,
  saveTimetable,
  getScheduleSettings,
  updateScheduleSettings,
  saveRepairProposal,
  applyRepairProposal,
} from '../data/store.js';
import {
  validateTimetable,
  generateTimetable,
  repairTimetable,
} from '../scheduler/index.js';
import type {
  TimetableEntry,
  Disruption,
  ScheduleSettingsPatch,
} from '../../../shared/contracts.js';

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
    const rawData = getBootstrapData();
    // Maintain strict consistency: always supply current live scheduleSettings
    const data = {
      ...rawData,
      scheduleSettings: getScheduleSettings(),
    };
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

// ─── GET /api/v1/schedule-settings ──────────────────────────────────
router.get('/schedule-settings', (_req: Request, res: Response) => {
  try {
    const settings = getScheduleSettings();
    res.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get schedule settings';
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message,
        details: [],
      },
    });
  }
});

// ─── PATCH /api/v1/schedule-settings ────────────────────────────────
router.patch('/schedule-settings', (req: Request, res: Response) => {
  try {
    const patch = req.body as ScheduleSettingsPatch;
    const updated = updateScheduleSettings(patch);
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update schedule settings';
    res.status(400).json({
      error: {
        code: 'INVALID_SETTINGS',
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

// ─── POST /api/v1/timetables/generate ───────────────────────────────
router.post('/timetables/generate', (req: Request, res: Response) => {
  try {
    const { semesters = [1, 2, 3], departmentId = 'CE' } = req.body || {};
    const settings = getScheduleSettings();
    const courses = getCourses();
    const teachers = getTeachers();
    const rooms = getRooms();
    const timeSlots = getTimeSlots();
    const sessions = getSessions();

    const result = generateTimetable({
      semesters,
      departmentId,
      courses,
      teachers,
      rooms,
      timeSlots,
      sessions,
      settings,
    });

    saveTimetable(result);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate timetable';
    res.status(500).json({
      error: {
        code: 'GENERATION_ERROR',
        message,
        details: [],
      },
    });
  }
});

// ─── POST /api/v1/timetables/:timetableId/validate ──────────────────
router.post('/timetables/:timetableId/validate', (req: Request, res: Response) => {
  try {
    const { timetableId } = req.params;
    const body = req.body as { entries?: TimetableEntry[] };

    let entriesToValidate = body?.entries;
    if (!entriesToValidate) {
      const stored = getTimetable(timetableId);
      if (!stored) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Timetable "${timetableId}" not found.`,
            details: [],
          },
        });
        return;
      }
      entriesToValidate = stored.entries;
    }

    const settings = getScheduleSettings();
    const timeSlots = getTimeSlots();
    const rooms = getRooms();
    const teachers = getTeachers();
    const courses = getCourses();
    const sessions = getSessions();

    const validation = validateTimetable(entriesToValidate, {
      settings,
      timeSlots,
      rooms,
      teachers,
      courses,
      sessions,
    });

    res.json(validation);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to validate timetable';
    res.status(500).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: [],
      },
    });
  }
});

// ─── POST /api/v1/timetables/:timetableId/repair ────────────────────
router.post('/timetables/:timetableId/repair', (req: Request, res: Response) => {
  try {
    const { timetableId } = req.params;
    const stored = getTimetable(timetableId);
    if (!stored) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Timetable "${timetableId}" not found.`,
          details: [],
        },
      });
      return;
    }

    const disruption = req.body?.disruption as Disruption;
    if (!disruption || !disruption.type || !disruption.targetId || !disruption.dayCode || !disruption.slotIds) {
      res.status(400).json({
        error: {
          code: 'INVALID_DISRUPTION',
          message: 'Disruption must specify type, targetId, dayCode, and slotIds.',
          details: [],
        },
      });
      return;
    }

    const settings = getScheduleSettings();
    const courses = getCourses();
    const teachers = getTeachers();
    const rooms = getRooms();
    const timeSlots = getTimeSlots();
    const sessions = getSessions();

    const proposal = repairTimetable({
      currentTimetable: stored,
      disruption,
      courses,
      teachers,
      rooms,
      timeSlots,
      sessions,
      settings,
    });

    // Save proposal in memory for subsequent preview / apply check (does NOT mutate stored timetable)
    saveRepairProposal(proposal);

    res.json(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate repair proposal';
    res.status(500).json({
      error: {
        code: 'REPAIR_ERROR',
        message,
        details: [],
      },
    });
  }
});

// ─── POST /api/v1/timetables/:timetableId/repair/apply ──────────────
router.post('/timetables/:timetableId/repair/apply', (req: Request, res: Response) => {
  try {
    const { timetableId } = req.params;
    const { changeSetId } = req.body || {};

    if (!changeSetId) {
      res.status(400).json({
        error: {
          code: 'MISSING_CHANGESET_ID',
          message: 'Missing changeSetId in apply request.',
          details: [],
        },
      });
      return;
    }

    const updated = applyRepairProposal(timetableId, changeSetId);
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply repair proposal';
    res.status(409).json({
      error: {
        code: 'REPAIR_APPLY_REJECTED',
        message,
        details: [],
      },
    });
  }
});

export default router;
