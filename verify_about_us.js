import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

async function verify() {
  console.log('--- Verification Started ---');

  try {
    // 1. Login as Admin
    console.log(`1. Logging in as Admin (${adminEmail})...`);
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully.');

    // 2. Initial Get About Us (Public)
    console.log('2. Fetching initial About Us content (Public)...');
    const getRes1 = await axios.get(`${BASE_URL}/content/about-us`);
    console.log('Initial Content:', getRes1.data.data.aboutUs);

    // 3. Update About Us (Admin)
    const newContent = 'This is the new "About Us" content updated by the Admin. It supports <b>HTML</b> and other rich text elements.';
    console.log('3. Updating About Us content (Admin)...');
    const updateRes = await axios.patch(
      `${BASE_URL}/content/about-us`,
      { aboutUs: newContent },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Update successful:', updateRes.data.message);

    // 4. Final Get About Us (Public)
    console.log('4. Fetching updated About Us content (Public)...');
    const getRes2 = await axios.get(`${BASE_URL}/content/about-us`);
    console.log('Updated Content:', getRes2.data.data.aboutUs);

    if (getRes2.data.data.aboutUs === newContent) {
      console.log('✅ Content verification PASSED.');
    } else {
      console.log('❌ Content verification FAILED.');
    }

    // 5. Unauthorized Try
    console.log('5. Attempting update WITHOUT token...');
    try {
      await axios.patch(`${BASE_URL}/content/about-us`, { aboutUs: 'Malicious update' });
      console.log('❌ Security check FAILED (Update allowed without token).');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✅ Security check PASSED (401 Unauthorized as expected).');
      } else {
        console.log('❌ Unexpected error during security check:', err.message);
      }
    }

    console.log('--- Verification Finished ---');
  } catch (error) {
    console.error('❌ Verification Error:', error.response?.data || error.message);
  }
}

verify();
