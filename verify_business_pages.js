import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

async function verify() {
  console.log('--- Business Pages Verification Started ---');

  try {
    // 1. Login as Admin
    console.log(`1. Logging in as Admin (${adminEmail})...`);
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully.');

    // 2. Fetch all content
    console.log('2. Fetching all site content...');
    const getRes1 = await axios.get(`${BASE_URL}/content`);
    console.log('Current content structure:', Object.keys(getRes1.data.data));

    // 3. Update multiple pages
    const updates = [
      { path: 'about-us', field: 'aboutUs', content: 'Updated About Us' },
      { path: 'terms-and-conditions', field: 'termsAndConditions', content: 'Updated Terms' },
      { path: 'privacy-policy', field: 'privacyPolicy', content: 'Updated Privacy' }
    ];

    for (const update of updates) {
      console.log(`3.${updates.indexOf(update)+1}. Updating ${update.path}...`);
      await axios.patch(
        `${BASE_URL}/content/${update.path}`,
        { [update.field]: update.content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`✅ ${update.path} updated.`);
    }

    // 4. Final Get to verify
    console.log('4. Verifying updates...');
    const getRes2 = await axios.get(`${BASE_URL}/content`);
    const data = getRes2.data.data;

    if (data.aboutUs === 'Updated About Us' && 
        data.termsAndConditions === 'Updated Terms' && 
        data.privacyPolicy === 'Updated Privacy') {
      console.log('✅ All updates verified successfully.');
    } else {
      console.log('❌ Update verification FAILED.');
      console.log('Data:', data);
    }

    // 5. Verify individual public endpoints
    console.log('5. Verifying individual public endpoints...');
    const endpoints = [
      { path: 'about-us', field: 'aboutUs', expected: 'Updated About Us' },
      { path: 'terms-and-conditions', field: 'termsAndConditions', expected: 'Updated Terms' }
    ];

    for (const ep of endpoints) {
      console.log(`Checking /content/${ep.path}...`);
      const res = await axios.get(`${BASE_URL}/content/${ep.path}`);
      // Check if the expected field is there and matches
      if (res.data.data[ep.field] === ep.expected) {
        console.log(`✅ ${ep.path} verified.`);
      } else {
        console.log(`❌ ${ep.path} verification FAILED.`, res.data.data);
      }
    }

    console.log('--- Business Pages Verification Finished ---');
  } catch (error) {
    console.error('❌ Verification Error:', error.response?.data || error.message);
  }
}

verify();
