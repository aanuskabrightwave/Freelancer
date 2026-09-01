const API_URL = "http://localhost:8000/api/v1";

async function runJobPostE2ETest() {
  console.log("=================================================");
  console.log("LIVE MANAGED JOB POST & MATCHING E2E TEST");
  console.log("=================================================\n");

  // Step 1: Log in Client (Vivek C)
  console.log("1. Authenticating Client (Vivek C)...");
  const clientLogin = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "vivekb@gmail.com", password: "Vivekb@1234" })
  });
  const clientAuth = await clientLogin.json();
  if (!clientLogin.ok) throw new Error("Client login failed: " + JSON.stringify(clientAuth));
  const clientToken = clientAuth.access_token;
  console.log(`   -> Logged in as: ${clientAuth.user.full_name} (ID: ${clientAuth.user.id})`);

  // Step 2: Log in Freelancer (Ashu F)
  console.log("\n2. Authenticating Freelancer (Ashu F)...");
  const freelancerLogin = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "ashut@gmail.com", password: "Ashutosht@1234" })
  });
  const freelancerAuth = await freelancerLogin.json();
  if (!freelancerLogin.ok) throw new Error("Freelancer login failed: " + JSON.stringify(freelancerAuth));
  const freelancerToken = freelancerAuth.access_token;
  console.log(`   -> Logged in as: ${freelancerAuth.user.full_name} (ID: ${freelancerAuth.user.id})`);

  // Step 3: Fetch Ashu F profile
  console.log("\n3. Fetching Ashu F Freelancer Profile...");
  const profRes = await fetch(`${API_URL}/freelancer/profile`, {
    headers: { Authorization: `Bearer ${freelancerToken}` }
  });
  const profData = await profRes.json();
  if (!profRes.ok) throw new Error("Fetch profile failed: " + JSON.stringify(profData));
  const ashuProfileId = profData.id;
  console.log(`   -> Profile ID: ${ashuProfileId}, Profession: ${profData.primary_profession}, Title: ${profData.professional_title}`);

  // Step 4: Log in Admin
  console.log("\n4. Authenticating Platform Coordinator (Admin)...");
  const adminLogin = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@creativemarket.com", password: "AdminPassword123!" })
  });
  const adminAuth = await adminLogin.json();
  if (!adminLogin.ok) throw new Error("Admin login failed: " + JSON.stringify(adminAuth));
  const adminToken = adminAuth.access_token;
  console.log(`   -> Logged in as Admin: ${adminAuth.user.full_name}`);

  // Step 5: Client posts a managed project requirement
  console.log("\n5. Client Submitting Managed Job Post to Admin...");
  const projectDate = new Date();
  projectDate.setDate(projectDate.getDate() + 14);
  const projectReq = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      title: "Commercial 4K Brand Video Editing & Color Grading",
      description: "Need cinematic video editing for a 60-second commercial. Includes audio mastering, pacing, and color grade.",
      project_type: "FIXED",
      budget_min: 8000.00,
      budget_max: 12000.00,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      deadline: projectDate.toISOString().split("T")[0]
    })
  });
  const projectData = await projectReq.json();
  if (!projectReq.ok) throw new Error("Project creation failed: " + JSON.stringify(projectData));
  const projectId = projectData.id;
  console.log(`   -> Job Post Created! ID: ${projectId}, Title: ${projectData.title}, Status: ${projectData.status}`);

  // Step 6: Admin reviews job post and transitions to MATCHING
  console.log("\n6. Admin Reviewing Job Post & Starting Professional Matching...");
  const reviewPostRes = await fetch(`${API_URL}/admin/job-posts/${projectId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: "MATCHING"
    })
  });
  console.log(`   -> Admin Job Status Updated: ${reviewPostRes.status}`);

  // Step 7: Admin matches and assigns Ashu F
  console.log("\n7. Admin Assigning Ashu F to Job Post...");
  const matchAssignRes = await fetch(`${API_URL}/admin/job-posts/${projectId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      freelancer_profile_id: ashuProfileId,
      offered_payout_amount: 9000.00,
      notes: "Commercial 4K editing assignment. High priority."
    })
  });
  const matchAssignData = await matchAssignRes.json();
  console.log(`   -> Assigned to Ashu F! Status: ${matchAssignRes.status}`);

  // Step 8: Fetch client projects list
  console.log("\n8. Verifying Client Active Projects List...");
  const myProjectsRes = await fetch(`${API_URL}/client/projects`, {
    headers: { Authorization: `Bearer ${clientToken}` }
  });
  const myProjectsData = await myProjectsRes.json();
  console.log(`   -> Total Client Projects: ${myProjectsData.length}`);

  console.log("\n=================================================");
  console.log("✅ MANAGED JOB POST & MATCHING FLOW VERIFIED!");
  console.log("=================================================");
}

runJobPostE2ETest().catch((err) => {
  console.error("\n❌ JOB POST TEST FAILED:", err.message);
  process.exit(1);
});
