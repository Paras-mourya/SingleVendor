import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

async function verifyAdminCaching() {
  console.log('--- Admin Caching Verification Started ---');

  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    const token = loginRes.data.data.tokens.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // 2. First GET /me (Cache MISS)
    console.log('\nSTEP 1: First GET /admin/me (Expect Middleware & Repository MISS)');
    await axios.get(`${BASE_URL}/admin/me`, { headers: authHeader });

    // 3. Second GET /me (Cache HIT)
    console.log('\nSTEP 2: Second GET /admin/me (Expect Middleware HIT)');
    await axios.get(`${BASE_URL}/admin/me`, { headers: authHeader });

    // 4. Update Profile (Invalidation)
    const newName = 'Admin ' + Date.now();
    console.log(`\nSTEP 3: Updating Name to "${newName}" (Expect Cache Invalidation)`);
    await axios.patch(
      `${BASE_URL}/admin/profile`,
      { name: newName },
      { headers: authHeader }
    );

    // 5. Third GET /me (Verify Fresh Data)
    console.log('\nSTEP 4: GET /admin/me after update (Expect MISS and New Data)');
    const res = await axios.get(`${BASE_URL}/admin/me`, { headers: authHeader });
    console.log('Name verified:', res.data.data.admin.name === newName);

    if (res.data.data.admin.name === newName) {
      console.log('\n✅ Admin Caching Verified: Logic is solid!');
    } else {
      console.log('\n❌ Admin Caching FAILED: Stale data detected.');
    }

    console.log('\n--- Admin Caching Verification Finished ---');
  } catch (error) {
    console.error('❌ Verification Error:', error.response?.data || error.message);
  }
}

verifyAdminCaching();
