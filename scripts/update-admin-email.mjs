// scripts/update-admin-email.mjs
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://assignment-attendance-system.vercel.app';

async function main() {
  console.log('Logging in as admin@attendance.local...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@attendance.local', password: 'password123' }),
  });

  if (!loginRes.ok) {
    // Maybe admin@campusattend.com already exists?
    console.log('Could not login as admin@attendance.local, testing admin@campusattend.com...');
    const testCom = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@campusattend.com', password: 'password123' }),
    });
    if (testCom.ok) {
      console.log('admin@campusattend.com already works!');
      return;
    }
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }

  const { token, user: adminUser } = await loginRes.json();
  console.log('Current Admin User in DB:', adminUser);

  // Update admin user email to admin@campusattend.com
  console.log(`Updating user ${adminUser.id} email to admin@campusattend.com...`);
  const updateRes = await fetch(`${BASE_URL}/api/users/${adminUser.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: 'admin@campusattend.com',
    }),
  });

  console.log('Update status:', updateRes.status);
  const updateData = await updateRes.text();
  console.log('Update response:', updateData);

  // Now verify logging in as admin@campusattend.com
  console.log('\nVerifying login with admin@campusattend.com...');
  const verifyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campusattend.com', password: 'password123' }),
  });
  console.log('Verify Status:', verifyRes.status);
  if (verifyRes.ok) {
    const vData = await verifyRes.json();
    console.log('SUCCESS! Admin logged in with .com:', vData.user);
  } else {
    console.error('Verify failed:', await verifyRes.text());
  }
}

main().catch(console.error);
