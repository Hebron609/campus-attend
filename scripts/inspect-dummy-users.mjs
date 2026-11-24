// scripts/inspect-dummy-users.mjs
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://assignment-attendance-system.vercel.app';

async function main() {
  console.log('Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campusattend.com', password: 'password123' }),
  });

  const { token } = await loginRes.json();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Fetch all users
  const usersRes = await fetch(`${BASE_URL}/api/users`, { headers });
  const { users } = await usersRes.json();
  console.log('\nAll users in backend:');
  users.forEach((u) => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
  });

  // 2. Fetch all courses and their enrolments
  const coursesRes = await fetch(`${BASE_URL}/api/courses`, { headers });
  const { courses } = await coursesRes.json();
  console.log('\nCourses & Enrolments:');
  for (const c of courses) {
    const enrRes = await fetch(`${BASE_URL}/api/courses/${c.id}/enrolments`, { headers });
    const enrData = await enrRes.json();
    console.log(`\nCourse ${c.id}: ${c.name}`);
    (enrData.enrolments || []).forEach((e) => {
      console.log(`  Enrolment ID: ${e.id} | Student ID: ${e.student?.id || e.studentId} | Name: ${e.student?.name} | Email: ${e.student?.email}`);
    });
  }

  // 3. Test if DELETE /api/users/:id exists
  console.log('\nTesting DELETE /api/users on a dummy user or checking options...');
  const dummyUser = users.find(u => u.email.includes('@attendance.local') && u.role === 'STUDENT');
  if (dummyUser) {
    console.log(`Testing DELETE on dummy user ${dummyUser.id} (${dummyUser.name})...`);
    const delRes = await fetch(`${BASE_URL}/api/users/${dummyUser.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`DELETE status: ${delRes.status}`);
    console.log(`DELETE body:`, await delRes.text());

    if (!delRes.ok) {
      // Test PATCH { isActive: false }
      console.log(`Testing PATCH isActive: false on ${dummyUser.id}...`);
      const patchRes = await fetch(`${BASE_URL}/api/users/${dummyUser.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: false }),
      });
      console.log(`PATCH status: ${patchRes.status}`);
      console.log(`PATCH body:`, await patchRes.text());
    }
  }

  // 4. Test if DELETE enrolment exists
  for (const c of courses) {
    const enrRes = await fetch(`${BASE_URL}/api/courses/${c.id}/enrolments`, { headers });
    const enrData = await enrRes.json();
    const dummyEnrol = (enrData.enrolments || []).find(e => e.student?.email?.includes('@attendance.local') || e.student?.email?.includes('hebronblay'));
    if (dummyEnrol) {
      console.log(`Testing DELETE enrolment for dummy ${dummyEnrol.id} (student ${dummyEnrol.student?.name}) in course ${c.id}...`);
      // Test DELETE /api/courses/:courseId/enrolments/:id
      const delEnr1 = await fetch(`${BASE_URL}/api/courses/${c.id}/enrolments/${dummyEnrol.id}`, {
        method: 'DELETE',
        headers,
      });
      console.log(`DELETE enrolment by enrId status: ${delEnr1.status}`);
      console.log(`DELETE body:`, await delEnr1.text());

      if (!delEnr1.ok) {
        // Test DELETE with studentId in body or param
        const delEnr2 = await fetch(`${BASE_URL}/api/courses/${c.id}/enrolments`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ studentId: dummyEnrol.student?.id || dummyEnrol.studentId }),
        });
        console.log(`DELETE enrolment by body status: ${delEnr2.status}`);
        console.log(`DELETE body:`, await delEnr2.text());
      }
      break;
    }
  }
}

main().catch(console.error);
