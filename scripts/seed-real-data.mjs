// scripts/seed-real-data.mjs
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://assignment-attendance-system.vercel.app';

const STUDENTS = [
  { name: 'EUGENE NARH AYIKU', studentId: 'ADS23B00245Y', email: 'ads23b00245y@campusattend.com' },
  { name: 'JEBUNI MOHAMMED JAMALDEEN', studentId: 'ADS23B00188Y', email: 'ads23b00188y@campusattend.com' },
  { name: 'SELORM AMU KOBLA', studentId: 'ADS23B00112Y', email: 'ads23b00112y@campusattend.com' },
  { name: 'OCEAN BLISS', studentId: 'BSCS16BIT0030Y', email: 'bscs16bit0030y@campusattend.com' },
  { name: 'ISRAEL AYIKU', studentId: 'ADS23B00249Y', email: 'ads23b00249y@campusattend.com' },
  { name: 'DEREK NHYIRA YANKYERAH', studentId: 'ADS23B00113Y', email: 'ads23b00113y@campusattend.com' },
  { name: 'IBRAHIM ALHASSAN', studentId: 'ADS23B00133Y', email: 'ads23b00133y@campusattend.com' },
];

async function main() {
  console.log(`Connecting to backend: ${BASE_URL}`);

  // 1. Login as Admin
  console.log('Authenticating as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@attendance.local', password: 'password123' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const { token } = await loginRes.json();
  console.log('Admin authenticated successfully.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Fetch existing users
  const usersRes = await fetch(`${BASE_URL}/api/users`, { headers });
  const { users } = await usersRes.json();
  console.log(`Existing users count: ${users.length}`);

  // 3. Create or find Dr. Wendy
  let drWendy = users.find((u) => u.email.toLowerCase() === 'dr.wendy@campusattend.com');
  if (!drWendy) {
    console.log('Creating lecturer: Dr. Wendy (dr.wendy@campusattend.com)...');
    const wendyRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Dr. Wendy',
        email: 'dr.wendy@campusattend.com',
        password: 'password123',
        role: 'LECTURER',
      }),
    });
    if (!wendyRes.ok) {
      console.error('Failed to create Dr. Wendy:', await wendyRes.text());
    } else {
      const data = await wendyRes.json();
      drWendy = data.user;
      console.log('Dr. Wendy created successfully: ID', drWendy.id);
    }
  } else {
    console.log('Dr. Wendy already exists: ID', drWendy.id);
  }

  // 4. Create Students
  const createdStudents = [];
  for (const st of STUDENTS) {
    let existing = users.find((u) => u.email.toLowerCase() === st.email.toLowerCase());
    if (!existing) {
      console.log(`Creating student ${st.name} (${st.email})...`);
      const createRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: st.name,
          email: st.email,
          password: 'password123',
          role: 'STUDENT',
        }),
      });
      if (createRes.ok) {
        const data = await createRes.json();
        console.log(`Created ${st.name}: ID ${data.user.id}`);
        createdStudents.push(data.user);
      } else {
        console.error(`Failed to create ${st.name}:`, await createRes.text());
      }
    } else {
      console.log(`Student already exists: ${st.name} (ID: ${existing.id})`);
      createdStudents.push(existing);
    }
  }

  // 5. Check and update courses
  const coursesRes = await fetch(`${BASE_URL}/api/courses`, { headers });
  const { courses } = await coursesRes.json();
  console.log('Existing courses:', courses.map((c) => ({ id: c.id, name: c.name, lecturerId: c.lecturerId })));

  if (drWendy) {
    // Check if Software Engineering Project course exists or create it
    let seCourse = courses.find((c) => c.name.toLowerCase().includes('software engineering'));
    if (!seCourse) {
      console.log('Creating course: CS403 Software Engineering Project with lecturer Dr. Wendy...');
      const courseCreateRes = await fetch(`${BASE_URL}/api/courses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'CS403 Software Engineering Project',
          lecturerId: drWendy.id,
        }),
      });
      if (courseCreateRes.ok) {
        const data = await courseCreateRes.json();
        seCourse = data.course;
        console.log('Course created:', seCourse);
      } else {
        console.error('Failed to create course:', await courseCreateRes.text());
      }
    }

    // Also update existing course 2 (Web Development) to have Dr. Wendy or keep both
    for (const course of courses) {
      console.log(`Assigning Dr. Wendy (ID: ${drWendy.id}) to course: ${course.name} (ID: ${course.id})...`);
      await fetch(`${BASE_URL}/api/courses/${course.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ lecturerId: drWendy.id }),
      });
    }

    // 6. Enrol all students into courses
    const allCoursesToEnrol = seCourse ? [...courses, seCourse] : courses;
    for (const course of allCoursesToEnrol) {
      console.log(`Enrolling students into course ${course.name} (ID: ${course.id})...`);
      for (const st of createdStudents) {
        const enrolRes = await fetch(`${BASE_URL}/api/courses/${course.id}/enrolments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ studentId: st.id }),
        });
        if (enrolRes.ok) {
          console.log(`Enrolled student ${st.name} (ID: ${st.id}) into course ${course.id}`);
        } else {
          // May already be enrolled
          const errText = await enrolRes.text();
          if (!errText.includes('already enrolled') && !errText.includes('Unique')) {
            console.log(`Enrol status for ${st.name}: ${errText}`);
          }
        }
      }
    }
  }

  // 7. Verify Student Login with real ID
  console.log('\n--- VERIFYING LOGIN WITH STUDENT ID ---');
  const studentVerifyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ads23b00133y@campusattend.com',
      password: 'password123',
    }),
  });
  console.log('Ibrahim Login Check Status:', studentVerifyRes.status);
  if (studentVerifyRes.ok) {
    const sData = await studentVerifyRes.json();
    console.log('Ibrahim successfully authenticated! User:', sData.user);
  }

  // 8. Verify Dr. Wendy Login
  console.log('\n--- VERIFYING LOGIN FOR DR. WENDY ---');
  const wendyVerifyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.wendy@campusattend.com',
      password: 'password123',
    }),
  });
  console.log('Dr. Wendy Login Check Status:', wendyVerifyRes.status);
  if (wendyVerifyRes.ok) {
    const wData = await wendyVerifyRes.json();
    console.log('Dr. Wendy successfully authenticated! User:', wData.user);
  }

  console.log('\nAll seed operations completed successfully!');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
