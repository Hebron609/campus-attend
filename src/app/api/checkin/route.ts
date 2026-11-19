import { NextResponse } from 'next/server';

interface CheckinRecord {
  studentId: number;
  studentName: string;
  timestamp: string;
}

interface ActiveSession {
  pin: string;
  courseId: number;
  courseName: string;
  sessionDate: string;
  roster: { id: number; name: string; email: string; studentId?: string }[];
  updatedAt: number;
}

// Global in-memory storage for active live session check-ins
// Key: `${courseId}-${date}` -> array of checked-in students
const globalStore = global as unknown as {
  activeCheckinsMap?: Map<string, CheckinRecord[]>;
  activeSessionsMap?: Map<string, ActiveSession>; // Key: pin -> ActiveSession
};

if (!globalStore.activeCheckinsMap) {
  globalStore.activeCheckinsMap = new Map<string, CheckinRecord[]>();
}
if (!globalStore.activeSessionsMap) {
  globalStore.activeSessionsMap = new Map<string, ActiveSession>();
}

const checkinsMap = globalStore.activeCheckinsMap;
const sessionsMap = globalStore.activeSessionsMap;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin');
  const courseId = searchParams.get('courseId');
  const date = searchParams.get('date');

  // 1. If lookup by 6-digit PIN (for back-row students entering PIN manually)
  if (pin) {
    const cleanPin = pin.replace(/\D/g, '');
    const active = sessionsMap.get(cleanPin);
    if (active) {
      return NextResponse.json({ active: true, session: active });
    }
    return NextResponse.json({ active: false, error: 'No active session found matching this PIN.' }, { status: 404 });
  }

  // 2. Lookup checkins for a course session
  if (!courseId || !date) {
    return NextResponse.json({ checkins: [] });
  }

  const key = `${courseId}-${date}`;
  const list = checkinsMap.get(key) || [];
  return NextResponse.json({ checkins: list });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Action A: Register or refresh active session with its 6-digit PIN from the lecturer's projector
    if (body.action === 'register_session') {
      const { pin, courseId, courseName, sessionDate, roster } = body;
      if (!pin || !courseId) {
        return NextResponse.json({ error: 'Missing pin or courseId' }, { status: 400 });
      }
      const cleanPin = String(pin).replace(/\D/g, '');
      const sessionData: ActiveSession = {
        pin: cleanPin,
        courseId: Number(courseId),
        courseName: courseName || 'Academic Course Session',
        sessionDate: sessionDate || new Date().toISOString().slice(0, 10),
        roster: Array.isArray(roster) ? roster : [],
        updatedAt: Date.now(),
      };
      sessionsMap.set(cleanPin, sessionData);
      return NextResponse.json({ success: true, registeredPin: cleanPin });
    }

    // Action B: Record a verified student check-in
    const { courseId, date, studentId, studentName } = body;

    if (!courseId || !date || !studentId) {
      return NextResponse.json({ error: 'Missing courseId, date, or studentId' }, { status: 400 });
    }

    const key = `${courseId}-${date}`;
    const list = checkinsMap.get(key) || [];

    const numId = Number(studentId);
    if (!list.some((r) => r.studentId === numId)) {
      list.push({
        studentId: numId,
        studentName: studentName || `Student #${numId}`,
        timestamp: new Date().toISOString(),
      });
      checkinsMap.set(key, list);
    }

    return NextResponse.json({ success: true, count: list.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to process check-in' }, { status: 500 });
  }
}
