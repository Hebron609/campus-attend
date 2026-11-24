// scripts/check-student-attendance.mjs
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://assignment-attendance-system.vercel.app';

async function main() {
  console.log('Logging in as Ibrahim...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ads23b00133y@campusattend.com',
      password: 'password123',
    }),
  });

  const { token, user } = await loginRes.json();
  console.log('Logged in user:', user);

  console.log('\nCalling GET /api/me/attendance...');
  const attRes = await fetch(`${BASE_URL}/api/me/attendance`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('Status:', attRes.status);
  const attData = await attRes.json();
  console.log('GET /api/me/attendance response:', JSON.stringify(attData, null, 2));

  // Also check GET /api/courses
  console.log('\nCalling GET /api/courses...');
  const coursesRes = await fetch(`${BASE_URL}/api/courses`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('Courses Status:', coursesRes.status);
  const coursesData = await coursesRes.json();
  console.log('GET /api/courses response:', JSON.stringify(coursesData, null, 2));

  // Also check course enrolments for courses
  if (coursesData.courses) {
    for (const c of coursesData.courses) {
      const enrRes = await fetch(`${BASE_URL}/api/courses/${c.id}/enrolments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Course ${c.id} enrolments status: ${enrRes.status}`);
      if (enrRes.ok) {
        const enrData = await enrRes.json();
        console.log(`Course ${c.id} (${c.name}) enrolments count:`, enrData.enrolments?.length);
        const myEnrol = enrData.enrolments?.find(e => e.studentId === user.id || e.student?.id === user.id);
        console.log(`Is student ${user.id} enrolled in course ${c.id}?`, !!myEnrol);
      }
    }
  }
}

main().catch(console.error);
