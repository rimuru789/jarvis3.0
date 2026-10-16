/**
 * SlotShield — Data loader
 * Reads JSON seed files from data/ directory.
 * JSON files are the runtime source of truth (not CSVs).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  BootstrapPayload,
  Course,
  Teacher,
  Room,
  TimeSlot,
  SessionRequirement,
  TimetableResult,
} from '../../../shared/contracts.js';

function findDataDir(): string {
  // 1. If starting from server directory, data is in ../data
  const fromServerCwd = resolve(process.cwd(), '..', 'data');
  if (existsSync(fromServerCwd) && existsSync(resolve(fromServerCwd, 'bootstrap.json'))) {
    return fromServerCwd;
  }

  // 2. If starting from workspace root, data is in ./data
  const fromRootCwd = resolve(process.cwd(), 'data');
  if (existsSync(fromRootCwd) && existsSync(resolve(fromRootCwd, 'bootstrap.json'))) {
    return fromRootCwd;
  }

  // 3. Fallback: search upwards from current module directory
  const moduleDir =
    typeof import.meta.dirname === 'string'
      ? import.meta.dirname
      : dirname(fileURLToPath(import.meta.url));

  let current = moduleDir;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(current, 'data');
    if (existsSync(candidate) && existsSync(resolve(candidate, 'bootstrap.json'))) {
      return candidate;
    }
    const parent = resolve(current, '..');
    if (parent === current) break;
    current = parent;
  }

  return fromServerCwd;
}

const DATA_DIR = findDataDir();

function loadJson<T>(filename: string): T {
  const filePath = resolve(DATA_DIR, filename);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

// ─── Lazy-loaded singletons ─────────────────────────────────────────

let _bootstrap: BootstrapPayload | null = null;
let _courses: Course[] | null = null;
let _teachers: Teacher[] | null = null;
let _rooms: Room[] | null = null;
let _timeSlots: TimeSlot[] | null = null;
let _sessions: SessionRequirement[] | null = null;
let _sampleTimetable: TimetableResult | null = null;

export function getBootstrapData(): BootstrapPayload {
  if (!_bootstrap) {
    _bootstrap = loadJson<BootstrapPayload>('bootstrap.json');
  }
  return _bootstrap;
}

export function getCourses(): Course[] {
  if (!_courses) {
    _courses = loadJson<Course[]>('courses.json');
  }
  return _courses;
}

export function getTeachers(): Teacher[] {
  if (!_teachers) {
    _teachers = loadJson<Teacher[]>('teachers.json');
  }
  return _teachers;
}

export function getRooms(): Room[] {
  if (!_rooms) {
    _rooms = loadJson<Room[]>('rooms.json');
  }
  return _rooms;
}

export function getTimeSlots(): TimeSlot[] {
  if (!_timeSlots) {
    _timeSlots = loadJson<TimeSlot[]>('time-slots.json');
  }
  return _timeSlots;
}

export function getSessions(): SessionRequirement[] {
  if (!_sessions) {
    _sessions = loadJson<SessionRequirement[]>('session-requirements.json');
  }
  return _sessions;
}

export function getSampleTimetable(): TimetableResult {
  if (!_sampleTimetable) {
    _sampleTimetable = loadJson<TimetableResult>('sample-timetable.json');
  }
  return _sampleTimetable;
}
