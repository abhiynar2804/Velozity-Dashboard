process.env.NODE_ENV = 'test';

import http from 'http';
import app from './index';
import prisma from './utils/prisma';

async function runAuthTests() {
  console.log('🧪 Starting Phase 2 Authentication Test Suite...\n');

  // Start local server instance on an ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const testEmail = `test.user.${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';

  let accessToken = '';
  let refreshCookie = '';

  try {
    // ----------------------------------------------------
    // TEST 1: Unauthenticated request to protected route
    // ----------------------------------------------------
    console.log('1️⃣ Testing protected route without token...');
    const unauthRes = await fetch(`${baseUrl}/api/protected`);
    const unauthBody = await unauthRes.json();
    if (unauthRes.status === 401 && !unauthBody.success) {
      console.log('   ✅ PASS: Protected route rejected unauthenticated request (401)');
    } else {
      throw new Error(`Expected 401 unauthenticated, got ${unauthRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 2: Register
    // ----------------------------------------------------
    console.log('\n2️⃣ Testing user registration...');
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        role: 'DEVELOPER',
      }),
    });
    const registerBody = await registerRes.json();
    const regSetCookie = registerRes.headers.get('set-cookie');

    if (registerRes.status === 201 && registerBody.success && registerBody.data.accessToken) {
      console.log('   ✅ PASS: User registered successfully');
      console.log('   ✅ PASS: Access token returned in response body');
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(registerBody)}`);
    }

    if (regSetCookie && regSetCookie.includes('refreshToken=') && regSetCookie.toLowerCase().includes('httponly')) {
      console.log('   ✅ PASS: Refresh token received in HttpOnly cookie');
    } else {
      throw new Error(`HttpOnly cookie missing in registration response: ${regSetCookie}`);
    }

    // ----------------------------------------------------
    // TEST 3: Login
    // ----------------------------------------------------
    console.log('\n3️⃣ Testing user login...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginBody = await loginRes.json();
    const loginSetCookie = loginRes.headers.get('set-cookie');

    if (loginRes.status === 200 && loginBody.success && loginBody.data.accessToken) {
      accessToken = loginBody.data.accessToken;
      console.log('   ✅ PASS: Login successful with valid credentials');
      console.log('   ✅ PASS: Access token generated');
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginBody)}`);
    }

    if (loginSetCookie && loginSetCookie.includes('refreshToken=') && loginSetCookie.toLowerCase().includes('httponly')) {
      // Extract cookie string for subsequent requests
      refreshCookie = loginSetCookie.split(';')[0];
      console.log('   ✅ PASS: Refresh token set in HttpOnly cookie');
    } else {
      throw new Error(`HttpOnly cookie missing in login response: ${loginSetCookie}`);
    }

    // ----------------------------------------------------
    // TEST 4: Invalid Password Login
    // ----------------------------------------------------
    console.log('\n4️⃣ Testing login with invalid password...');
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });
    if (badLoginRes.status === 401) {
      console.log('   ✅ PASS: Rejected invalid credentials (401)');
    } else {
      throw new Error(`Expected 401 for wrong password, got ${badLoginRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 5: Access Protected Route with Access Token
    // ----------------------------------------------------
    console.log('\n5️⃣ Testing access to protected endpoint with Access Token...');
    const protectedRes = await fetch(`${baseUrl}/api/protected`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const protectedBody = await protectedRes.json();
    if (protectedRes.status === 200 && protectedBody.success) {
      console.log('   ✅ PASS: Authenticated request accepted (200)');
      console.log(`   ✅ PASS: User identified as ${protectedBody.data.user.email} (${protectedBody.data.user.role})`);
    } else {
      throw new Error(`Protected route rejected valid token: ${JSON.stringify(protectedBody)}`);
    }

    // ----------------------------------------------------
    // TEST 6: Access /api/auth/me Profile Route
    // ----------------------------------------------------
    console.log('\n6️⃣ Testing /api/auth/me profile endpoint...');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const meBody = await meRes.json();
    if (meRes.status === 200 && meBody.data.email === testEmail) {
      console.log('   ✅ PASS: /api/auth/me returned user profile');
    } else {
      throw new Error(`/api/auth/me failed: ${JSON.stringify(meBody)}`);
    }

    // ----------------------------------------------------
    // TEST 7: Refresh Token via HttpOnly Cookie
    // ----------------------------------------------------
    console.log('\n7️⃣ Testing token refresh via HttpOnly cookie...');
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshCookie,
      },
    });
    const refreshBody = await refreshRes.json();
    const newRefreshSetCookie = refreshRes.headers.get('set-cookie');

    if (refreshRes.status === 200 && refreshBody.success && refreshBody.data.accessToken) {
      const newAccessToken = refreshBody.data.accessToken;
      console.log('   ✅ PASS: Refresh token accepted');
      console.log('   ✅ PASS: New access token issued');

      // Test that new access token works
      const verifyNewTokenRes = await fetch(`${baseUrl}/api/protected`, {
        headers: { Authorization: `Bearer ${newAccessToken}` },
      });
      if (verifyNewTokenRes.status === 200) {
        console.log('   ✅ PASS: Newly issued access token is valid');
      } else {
        throw new Error('Newly issued access token was not valid');
      }
    } else {
      throw new Error(`Refresh failed: ${JSON.stringify(refreshBody)}`);
    }

    if (newRefreshSetCookie && newRefreshSetCookie.includes('refreshToken=')) {
      refreshCookie = newRefreshSetCookie.split(';')[0];
      console.log('   ✅ PASS: Rotated refresh token HttpOnly cookie received');
    } else {
      throw new Error('Rotated refresh token cookie missing');
    }

    // ----------------------------------------------------
    // TEST 8: Logout
    // ----------------------------------------------------
    console.log('\n8️⃣ Testing logout and token invalidation...');
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: refreshCookie,
      },
    });
    const logoutBody = await logoutRes.json();
    const logoutSetCookie = logoutRes.headers.get('set-cookie');

    if (logoutRes.status === 200 && logoutBody.success) {
      console.log('   ✅ PASS: Logout successful');
    } else {
      throw new Error(`Logout failed: ${JSON.stringify(logoutBody)}`);
    }

    if (logoutSetCookie && (logoutSetCookie.includes('Max-Age=0') || logoutSetCookie.includes('Expires='))) {
      console.log('   ✅ PASS: HttpOnly refresh token cookie cleared');
    } else {
      throw new Error(`Logout did not clear cookie: ${logoutSetCookie}`);
    }

    // ----------------------------------------------------
    // TEST 9: Attempt Refresh with Logged Out Token
    // ----------------------------------------------------
    console.log('\n9️⃣ Testing refresh with revoked token (post-logout)...');
    const postLogoutRefresh = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshCookie,
      },
    });
    if (postLogoutRefresh.status === 401 || postLogoutRefresh.status === 403) {
      console.log('   ✅ PASS: Revoked refresh token rejected (401/403)');
    } else {
      throw new Error(`Expected revoked token to be rejected, got status ${postLogoutRefresh.status}`);
    }

    console.log('\n🎉 ALL AUTHENTICATION CHECKPOINTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Clean up test user & tokens
    try {
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      if (user) {
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      // Ignore cleanup error
    }

    server.close();
    await prisma.$disconnect();
  }
}

runAuthTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
