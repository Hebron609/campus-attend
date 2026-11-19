import { NextResponse } from 'next/server';

interface CheckinRecord {
  studentId: number;
  studentName: string;
  timestamp: string;
}

// Global in-memory storage for active live session check-ins
// Key: `${courseId}-${date}` -> array of checked-in students
const globalStore = global as unknown as {
  activeCheckinsMap?: Map<string, CheckinRecord[]>;
};

if (!globalStore.activeCheckinsMap) {
  globalStore.activeCheckinsMap = new Map<string, CheckinRecord[]>();
}

const checkinsMap = globalStore.activeCheckinsMap;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  const date = searchParams.get('date');

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
