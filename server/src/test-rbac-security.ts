process.env.NODE_ENV = 'test';

import http from 'http';
import app from './index';
import prisma from './utils/prisma';
import { generateAccessToken } from './utils/token.utils';
import { UserRole } from '@prisma/client';

async function runSecurityTests() {
  console.log('🛡️ Starting Phase 3 RBAC & Security Test Suite...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const timestamp = Date.now();
  let adminId = '', pm1Id = '', pm2Id = '', dev1Id = '', dev2Id = '';
  let adminToken = '', pm1Token = '', pm2Token = '', dev1Token = '', dev2Token = '';
  let clientId = '';
  let pm1ProjectId = '', pm2ProjectId = '';
  let dev1TaskId = '', dev2TaskId = '';

  try {
    // ----------------------------------------------------
    // SETUP TEST FIXTURES
    // ----------------------------------------------------
    console.log('🔧 Setting up test entities (Admin, PM1, PM2, Dev1, Dev2, Client, Projects, Tasks)...');

    // 1. Create Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin User',
        email: `admin.${timestamp}@test.com`,
        password: 'Password123!',
        role: 'ADMIN',
      }),
    });
    const adminData = await adminRes.json();
    adminId = adminData.data.user.id;
    adminToken = adminData.data.accessToken;

    // 2. Create PM 1
    const pm1Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Project Manager 1',
        email: `pm1.${timestamp}@test.com`,
        password: 'Password123!',
        role: 'PROJECT_MANAGER',
      }),
    });
    const pm1Data = await pm1Res.json();
    pm1Id = pm1Data.data.user.id;
    pm1Token = pm1Data.data.accessToken;

    // 3. Create PM 2
    const pm2Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Project Manager 2',
        email: `pm2.${timestamp}@test.com`,
        password: 'Password123!',
        role: 'PROJECT_MANAGER',
      }),
    });
    const pm2Data = await pm2Res.json();
    pm2Id = pm2Data.data.user.id;
    pm2Token = pm2Data.data.accessToken;

    // 4. Create Developer 1
    const dev1Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Developer 1',
        email: `dev1.${timestamp}@test.com`,
        password: 'Password123!',
        role: 'DEVELOPER',
      }),
    });
    const dev1Data = await dev1Res.json();
    dev1Id = dev1Data.data.user.id;
    dev1Token = dev1Data.data.accessToken;

    // 5. Create Developer 2
    const dev2Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Developer 2',
        email: `dev2.${timestamp}@test.com`,
        password: 'Password123!',
        role: 'DEVELOPER',
      }),
    });
    const dev2Data = await dev2Res.json();
    dev2Id = dev2Data.data.user.id;
    dev2Token = dev2Data.data.accessToken;

    // 6. Admin creates Client
    const clientRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Acme Corp ${timestamp}`,
        email: `contact@acme${timestamp}.com`,
        company: 'Acme International',
      }),
    });
    const clientData = await clientRes.json();
    clientId = clientData.data.id;

    // 7. PM1 creates Project 1
    const p1Res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1Token}`,
      },
      body: JSON.stringify({
        name: `PM1 Project Alpha ${timestamp}`,
        description: 'Project owned by PM1',
        clientId,
      }),
    });
    const p1Data = await p1Res.json();
    pm1ProjectId = p1Data.data.id;

    // 8. PM2 creates Project 2
    const p2Res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm2Token}`,
      },
      body: JSON.stringify({
        name: `PM2 Project Beta ${timestamp}`,
        description: 'Project owned by PM2',
        clientId,
      }),
    });
    const p2Data = await p2Res.json();
    pm2ProjectId = p2Data.data.id;

    // 9. PM1 creates Task 1 assigned to Dev1
    const t1Res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1Token}`,
      },
      body: JSON.stringify({
        title: 'Dev 1 Task',
        description: 'Task for developer 1',
        projectId: pm1ProjectId,
        assignedDeveloperId: dev1Id,
        priority: 'HIGH',
      }),
    });
    const t1Data = await t1Res.json();
    dev1TaskId = t1Data.data.id;

    // 10. PM2 creates Task 2 assigned to Dev2
    const t2Res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm2Token}`,
      },
      body: JSON.stringify({
        title: 'Dev 2 Task',
        description: 'Task for developer 2',
        projectId: pm2ProjectId,
        assignedDeveloperId: dev2Id,
        priority: 'CRITICAL',
      }),
    });
    const t2Data = await t2Res.json();
    dev2TaskId = t2Data.data.id;

    console.log('   ✅ Test entities successfully provisioned in PostgreSQL database.\n');

    // ----------------------------------------------------
    // TEST 1: Unauthenticated request to protected endpoint ❌
    // ----------------------------------------------------
    console.log('🔒 TEST 1: Unauthenticated → protected endpoint ❌');
    const unauthReq = await fetch(`${baseUrl}/api/projects`);
    if (unauthReq.status === 401) {
      console.log('   ✅ PASS: Unauthenticated request rejected (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthReq.status}`);
    }

    // ----------------------------------------------------
    // TEST 2: Modified JWT role → unauthorized access ❌
    // ----------------------------------------------------
    console.log('\n🔒 TEST 2: Modified JWT role (tampered token) → unauthorized access ❌');
    // Forge a modified token by splitting JWT, changing payload to ADMIN, but without valid signature
    const [header, , sig] = dev1Token.split('.');
    const fakePayload = Buffer.from(
      JSON.stringify({ userId: dev1Id, email: `dev1.${timestamp}@test.com`, role: 'ADMIN' })
    ).toString('base64url');
    const forgedToken = `${header}.${fakePayload}.${sig}`;

    const forgedRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    if (forgedRes.status === 401) {
      console.log('   ✅ PASS: Tampered token with forged role rejected by JWT verification (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 for forged token, got ${forgedRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 3: Developer → admin data ❌
    // ----------------------------------------------------
    console.log('\n🔒 TEST 3: Developer → admin data (Users & Client management) ❌');
    // Attempt 1: Dev1 tries to list users
    const devListUsersRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    if (devListUsersRes.status === 403) {
      console.log('   ✅ PASS: Developer cannot view user directory (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for Dev listing users, got ${devListUsersRes.status}`);
    }

    // Attempt 2: Dev1 tries to create client
    const devCreateClientRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Token}`,
      },
      body: JSON.stringify({ name: 'Hacked Client' }),
    });
    if (devCreateClientRes.status === 403) {
      console.log('   ✅ PASS: Developer cannot create clients (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for Dev creating client, got ${devCreateClientRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 4: Developer → PM project ❌
    // ----------------------------------------------------
    console.log('\n🔒 TEST 4: Developer → PM project management & unassigned project ❌');
    // Attempt 1: Dev1 tries to create a project
    const devCreateProjectRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Token}`,
      },
      body: JSON.stringify({ name: 'Dev Project', clientId }),
    });
    if (devCreateProjectRes.status === 403) {
      console.log('   ✅ PASS: Developer cannot create projects (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for Dev creating project, got ${devCreateProjectRes.status}`);
    }

    // Attempt 2: Dev1 tries to directly access PM2 project where Dev1 has NO tasks
    const devAccessPM2ProjectRes = await fetch(`${baseUrl}/api/projects/${pm2ProjectId}`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    if (devAccessPM2ProjectRes.status === 403) {
      console.log('   ✅ PASS: Developer cannot view unassigned project (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for Dev accessing unassigned project, got ${devAccessPM2ProjectRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 5: PM1 → PM2 project ❌
    // ----------------------------------------------------
    console.log('\n🔒 TEST 5: PM1 → PM2 project isolation ❌');
    // Attempt 1: PM1 tries to view PM2's project
    const pm1ViewPM2Res = await fetch(`${baseUrl}/api/projects/${pm2ProjectId}`, {
      headers: { Authorization: `Bearer ${pm1Token}` },
    });
    if (pm1ViewPM2Res.status === 403) {
      console.log("   ✅ PASS: PM1 cannot view PM2's project (403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for PM1 viewing PM2 project, got ${pm1ViewPM2Res.status}`);
    }

    // Attempt 2: PM1 tries to update PM2's project
    const pm1UpdatePM2Res = await fetch(`${baseUrl}/api/projects/${pm2ProjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1Token}`,
      },
      body: JSON.stringify({ name: 'Renamed by Attacker PM1' }),
    });
    if (pm1UpdatePM2Res.status === 403) {
      console.log("   ✅ PASS: PM1 cannot update PM2's project (403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for PM1 updating PM2 project, got ${pm1UpdatePM2Res.status}`);
    }

    // Attempt 3: PM1 tries to create task inside PM2's project
    const pm1CreateTaskPM2Res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1Token}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Task',
        projectId: pm2ProjectId,
      }),
    });
    if (pm1CreateTaskPM2Res.status === 403) {
      console.log("   ✅ PASS: PM1 cannot create tasks in PM2's project (403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for PM1 creating task in PM2 project, got ${pm1CreateTaskPM2Res.status}`);
    }

    // ----------------------------------------------------
    // TEST 6: Developer → another developer's task ❌
    // ----------------------------------------------------
    console.log("\n🔒 TEST 6: Developer 1 → Developer 2's task ❌");
    // Attempt 1: Dev1 tries to view Dev2's task
    const dev1ViewDev2TaskRes = await fetch(`${baseUrl}/api/tasks/${dev2TaskId}`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    if (dev1ViewDev2TaskRes.status === 403) {
      console.log("   ✅ PASS: Developer 1 cannot view Developer 2's task (403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for Dev1 viewing Dev2 task, got ${dev1ViewDev2TaskRes.status}`);
    }

    // Attempt 2: Dev1 tries to update Dev2's task status
    const dev1UpdateDev2TaskRes = await fetch(`${baseUrl}/api/tasks/${dev2TaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Token}`,
      },
      body: JSON.stringify({ status: 'DONE' }),
    });
    if (dev1UpdateDev2TaskRes.status === 403) {
      console.log("   ✅ PASS: Developer 1 cannot update Developer 2's task (403 Forbidden)");
    } else {
      throw new Error(`Expected 403 for Dev1 updating Dev2 task, got ${dev1UpdateDev2TaskRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 7: Developer Updating Forbidden Task Fields ❌
    // ----------------------------------------------------
    console.log("\n🔒 TEST 7: Developer attempting to reassign or modify title of their own task ❌");
    const dev1TamperTaskRes = await fetch(`${baseUrl}/api/tasks/${dev1TaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Token}`,
      },
      body: JSON.stringify({
        title: 'Tampered Title by Developer',
        assignedDeveloperId: dev2Id,
      }),
    });
    if (dev1TamperTaskRes.status === 403) {
      console.log('   ✅ PASS: Developer cannot modify non-status fields (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for Dev editing title/reassigning, got ${dev1TamperTaskRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 8: Developer Updating Status of Their Own Task ✅
    // ----------------------------------------------------
    console.log("\n🔓 TEST 8: Developer updating status of their own assigned task (TODO → IN_PROGRESS → IN_REVIEW) ✅");
    const dev1UpdateStatusRes = await fetch(`${baseUrl}/api/tasks/${dev1TaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Token}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const dev1UpdateStatusData = await dev1UpdateStatusRes.json();
    if (dev1UpdateStatusRes.status === 200 && dev1UpdateStatusData.data.status === 'IN_PROGRESS') {
      console.log('   ✅ PASS: Developer 1 successfully updated assigned task status to IN_PROGRESS (200)');
    } else {
      throw new Error(`Status update failed: ${JSON.stringify(dev1UpdateStatusData)}`);
    }

    // Check activity log was created
    const activityRes = await fetch(`${baseUrl}/api/activities?projectId=${pm1ProjectId}`, {
      headers: { Authorization: `Bearer ${pm1Token}` },
    });
    const activityData = await activityRes.json();
    if (activityData.data.length > 0 && activityData.data[0].newStatus === 'IN_PROGRESS') {
      console.log('   ✅ PASS: Status transition activity recorded in database');
    } else {
      throw new Error('Activity log was not recorded');
    }

    // ----------------------------------------------------
    // TEST 9: Admin Full Access Verification ✅
    // ----------------------------------------------------
    console.log('\n🔓 TEST 9: Admin full management access verification ✅');
    const adminProjectsRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminProjectsData = await adminProjectsRes.json();
    if (adminProjectsRes.status === 200 && adminProjectsData.data.length >= 2) {
      console.log(`   ✅ PASS: Admin successfully viewed all ${adminProjectsData.data.length} projects across all PMs`);
    } else {
      throw new Error('Admin could not view all projects');
    }

    const adminUsersRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminUsersData = await adminUsersRes.json();
    if (adminUsersRes.status === 200 && adminUsersData.data.length >= 5) {
      console.log(`   ✅ PASS: Admin successfully managed user registry (${adminUsersData.data.length} users)`);
    } else {
      throw new Error('Admin could not list all users');
    }

    console.log('\n🎉 ALL PHASE 3 API AUTHORIZATION & SECURITY TESTS PASSED PERFECTLY!\n');
  } finally {
    // Clean up test data
    try {
      if (dev1TaskId) await prisma.task.deleteMany({ where: { id: { in: [dev1TaskId, dev2TaskId] } } });
      if (pm1ProjectId) await prisma.project.deleteMany({ where: { id: { in: [pm1ProjectId, pm2ProjectId] } } });
      if (clientId) await prisma.client.deleteMany({ where: { id: clientId } });
      const userIds = [adminId, pm1Id, pm2Id, dev1Id, dev2Id].filter(Boolean);
      if (userIds.length) {
        await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.activity.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    server.close();
    await prisma.$disconnect();
  }
}

runSecurityTests().catch((err) => {
  console.error('❌ Security test suite failed:', err);
  process.exit(1);
});
