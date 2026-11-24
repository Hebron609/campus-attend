// scripts/deactivate-dummy-users.mjs
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://assignment-attendance-system.vercel.app';

async function main() {
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

  const usersRes = await fetch(`${BASE_URL}/api/users`, { headers });
  const { users } = await usersRes.json();

  const dummyIds = [2, 3, 4, 5, 6, 7, 12];
  for (const id of dummyIds) {
    const user = users.find(u => u.id === id);
    if (user) {
      console.log(`Deactivating dummy user ${id} (${user.name} / ${user.email})...`);
      const patchRes = await fetch(`${BASE_URL}/api/users/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: false }),
      });
      console.log(`Result for ${id}: ${patchRes.status}`);
    }
  }

  console.log('All dummy users deactivated in backend.');
}

main().catch(console.error);
