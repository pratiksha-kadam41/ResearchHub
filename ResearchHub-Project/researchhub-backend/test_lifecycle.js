const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const http = require("node:http");

async function runTests() {
  console.log("==========================================");
  console.log("STARTING RESEARCHHUB END-TO-END TEST SUITE");
  console.log("==========================================\n");

  const BASE_URL = "http://127.0.0.1:5001";
  const app = express();
  app.use(express.json());

  // Mount existing routes
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/student", require("./routes/studentRoutes"));
  app.use("/api/faculty", require("./routes/facultyRoutes"));
  app.use("/api/mentor-requests", require("./routes/mentorRequestRoutes"));
  app.use("/api/milestones", require("./routes/milestoneRoutes"));
  app.use("/api/tasks", require("./routes/taskRoutes"));
  app.use("/api/submissions", require("./routes/submissionRoutes"));
  app.use("/api/resources", require("./routes/resourceRoutes"));
  app.use("/api/collaboration", require("./routes/collaborationRoutes"));
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/repositories", require("./routes/repositoryRoutes"));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5001, "127.0.0.1", resolve));
  console.log("✓ Test server listening on http://127.0.0.1:5001\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const studentEmail = `student_${timestamp}@test.edu`;
  const facultyEmail = `faculty_${timestamp}@test.edu`;
  const password = "Password123!";

  let studentToken = "";
  let facultyToken = "";
  let studentId = null;
  let facultyId = null;
  let repoId = null;
  let milestoneId = null;
  let taskId = null;
  let submissionId = null;
  let mentorRequestId = null;

  try {
    // -----------------------------------------------------------------
    // TEST 1: Register Student
    // -----------------------------------------------------------------
    console.log("--- 1. User Registration & Authentication ---");
    const regStudentRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Researcher",
        email: studentEmail,
        password,
        role: "student",
        institution: "State University",
        course: "Computer Science",
      }),
    });
    const regStudentData = await regStudentRes.json();
    assert(regStudentRes.status === 201, "Register student account returns 201");

    // TEST 2: Register Faculty
    const regFacultyRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Robert Smith",
        email: facultyEmail,
        password,
        role: "faculty",
        institution: "State University",
      }),
    });
    const regFacultyData = await regFacultyRes.json();
    assert(regFacultyRes.status === 201, "Register faculty account returns 201");

    // TEST 3: Login Student
    const loginStudentRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentEmail, password }),
    });
    const loginStudentData = await loginStudentRes.json();
    assert(loginStudentRes.status === 200 && loginStudentData.token, "Student login returns 200 with JWT token");
    studentToken = loginStudentData.token;
    studentId = loginStudentData.user.id;

    // TEST 4: Login Faculty
    const loginFacultyRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: facultyEmail, password }),
    });
    const loginFacultyData = await loginFacultyRes.json();
    assert(loginFacultyRes.status === 200 && loginFacultyData.token, "Faculty login returns 200 with JWT token");
    facultyToken = loginFacultyData.token;
    facultyId = loginFacultyData.user.id;

    // -----------------------------------------------------------------
    // TEST 5 & 6: Student Profile Management
    // -----------------------------------------------------------------
    console.log("\n--- 2. Profile Management ---");
    const createProfileRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        phone: "9876543210",
        date_of_birth: "2000-01-15",
        gender: "female",
        enrollment_number: "ENR123456",
        specialization: "AI & Data Science",
        research_interests: "Machine Learning, Natural Language Processing",
        skills: "Python, PyTorch, React",
        research_areas: "Computer Vision, Deep Learning",
      }),
    });
    assert(createProfileRes.status === 201, "Student creates detailed profile");

    const getProfileRes = await fetch(`${BASE_URL}/api/student/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const profileData = await getProfileRes.json();
    assert(getProfileRes.status === 200 && profileData.profile.enrollment_number === "ENR123456", "Student fetches detailed profile");

    // -----------------------------------------------------------------
    // TEST 7: Faculty Profile Management & Discovery
    // -----------------------------------------------------------------
    console.log("\n--- 3. Faculty Profile & Discovery ---");
    const updateFacultyRes = await fetch(`${BASE_URL}/api/faculty/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        designation: "Associate Professor",
        research_areas: "Deep Learning, NLP, Healthcare AI",
        expertise: "Transformers, Computer Vision",
        research_interests: "Medical Diagnostics",
        experience: "12 years academic research",
        guidance_areas: "Master's Thesis, Capstone AI",
      }),
    });
    assert(updateFacultyRes.status === 200, "Faculty updates research profile");

    const searchFacultyRes = await fetch(`${BASE_URL}/api/faculty?search=Healthcare`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const searchFacultyData = await searchFacultyRes.json();
    assert(
      searchFacultyRes.status === 200 && searchFacultyData.faculty.length > 0,
      "Student discovers faculty by research keyword search"
    );

    // -----------------------------------------------------------------
    // TEST 8: Repository / Project Creation
    // -----------------------------------------------------------------
    console.log("\n--- 4. Research Project Management ---");
    const createRepoRes = await fetch(`${BASE_URL}/api/repositories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        name: "AI Diagnostics System",
        description: "Automated radiology report classification using LLMs",
        domain: "Healthcare AI",
        researchType: "individual",
        privacy: "private",
      }),
    });
    const createRepoData = await createRepoRes.json();
    assert(createRepoRes.status === 201 && createRepoData.repositoryId, "Student creates research repository");
    repoId = createRepoData.repositoryId;

    // -----------------------------------------------------------------
    // TEST 9 & 10: Mentor Guidance Request Flow
    // -----------------------------------------------------------------
    console.log("\n--- 5. Mentor Guidance Request Flow ---");
    const sendReqRes = await fetch(`${BASE_URL}/api/mentor-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        repositoryId: repoId,
        facultyId: facultyId,
        message: "We would appreciate your mentorship on radiology dataset evaluation.",
      }),
    });
    const sendReqData = await sendReqRes.json();
    assert(sendReqRes.status === 201 && sendReqData.mentorRequestId, "Student sends mentor guidance request");
    mentorRequestId = sendReqData.mentorRequestId;

    // Faculty accepts request
    const acceptReqRes = await fetch(`${BASE_URL}/api/mentor-requests/${mentorRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({ status: "ACCEPTED" }),
    });
    assert(acceptReqRes.status === 200, "Faculty accepts mentorship request");

    // -----------------------------------------------------------------
    // TEST 11, 12, 13: Milestone Management & Weight Validation
    // -----------------------------------------------------------------
    console.log("\n--- 6. Milestone Management & Weight Validation ---");
    const createMsRes = await fetch(`${BASE_URL}/api/milestones/repository/${repoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        title: "Milestone 1: Literature Survey & Data Pipeline",
        description: "Benchmark open models and curate chest X-ray datasets",
        weight: 40,
        deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
      }),
    });
    const createMsData = await createMsRes.json();
    assert(createMsRes.status === 201 && createMsData.milestoneId, "Faculty creates milestone with 40% weight");
    milestoneId = createMsData.milestoneId;

    // Attempt to create milestone with weight that exceeds 100% total (e.g., 70% when 40% exists => 110%)
    const overWeightRes = await fetch(`${BASE_URL}/api/milestones/repository/${repoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        title: "Milestone Overweight",
        weight: 70,
        deadline: new Date(Date.now() + 86400000 * 20).toISOString(),
      }),
    });
    assert(overWeightRes.status === 409, "Validation rejects milestone exceeding 100% cumulative weight (409 Conflict)");

    // Student updates milestone progress
    const updateProgressRes = await fetch(`${BASE_URL}/api/milestones/${milestoneId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ completionPercentage: 75 }),
    });
    assert(updateProgressRes.status === 200, "Student updates milestone completion percentage");

    // -----------------------------------------------------------------
    // TEST 14: Task Management
    // -----------------------------------------------------------------
    console.log("\n--- 7. Task Management ---");
    const createTaskRes = await fetch(`${BASE_URL}/api/tasks/milestone/${milestoneId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        title: "Clean and filter MIMIC dataset",
        description: "Remove corrupted image headers and tokenize reports",
        priority: "HIGH",
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        assignedTo: studentId,
      }),
    });
    const createTaskData = await createTaskRes.json();
    assert(createTaskRes.status === 201 && createTaskData.taskId, "Faculty assigns task to student");
    taskId = createTaskData.taskId;

    // Student updates task progress
    const updateTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ status: "COMPLETED", progressPercentage: 100 }),
    });
    assert(updateTaskRes.status === 200, "Student marks assigned task as completed");

    // -----------------------------------------------------------------
    // TEST 15 & 16: Submission & Review Lifecycle
    // -----------------------------------------------------------------
    console.log("\n--- 8. Milestone Submission & Faculty Review ---");
    const submitWorkRes = await fetch(`${BASE_URL}/api/submissions/milestone/${milestoneId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        workUrl: "https://github.com/example/rad-classifier",
        notes: "Completed literature review and trained initial ResNet baseline model.",
      }),
    });
    const submitWorkData = await submitWorkRes.json();
    assert(submitWorkRes.status === 201 && submitWorkData.submissionId, "Student submits milestone deliverables");
    submissionId = submitWorkData.submissionId;

    // Faculty reviews submission
    const reviewRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        decision: "APPROVED",
        feedback: "Methodology is sound. Baseline results meet requirements for Phase 1.",
      }),
    });
    assert(reviewRes.status === 200, "Faculty reviews and approves milestone submission");

    // -----------------------------------------------------------------
    // TEST 17: Academic Evaluation & Marks / Penalties
    // -----------------------------------------------------------------
    console.log("\n--- 9. Academic Evaluation, Marks & Penalties ---");
    const evalRes = await fetch(`${BASE_URL}/api/submissions/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        repositoryId: repoId,
        studentId: studentId,
        milestoneId: milestoneId,
        submissionId: submissionId,
        originalMarks: 25,
        deductedMarks: 2,
        deductionReason: "Minor formatting penalty in code documentation",
      }),
    });
    const evalData = await evalRes.json();
    assert(
      evalRes.status === 201 && evalData.finalMarks === 23,
      "Faculty enters evaluation: 25 original - 2 penalty = 23 final marks"
    );

    // Student views evaluations
    const getEvalRes = await fetch(`${BASE_URL}/api/submissions/evaluations/repository/${repoId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getEvalData = await getEvalRes.json();
    assert(
      getEvalRes.status === 200 && getEvalData.evaluations.length > 0 && getEvalData.evaluations[0].final_marks === "23.00",
      "Student views accurate evaluation marks and deduction reason"
    );

    // -----------------------------------------------------------------
    // TEST 18: Research Resources Management
    // -----------------------------------------------------------------
    console.log("\n--- 10. Research Resource & Shared Library ---");
    const createResourceRes = await fetch(`${BASE_URL}/api/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        repositoryId: repoId,
        title: "Stanford CheXpert Dataset Link",
        resourceType: "DATASET",
        resourceUrl: "https://stanfordmlgroup.github.io/competitions/chexpert/",
        notes: "Chest radiographs reference benchmark dataset",
        visibility: "SHARED",
      }),
    });
    assert(createResourceRes.status === 201, "User adds resource with SHARED visibility");

    const getSharedLibRes = await fetch(`${BASE_URL}/api/resources/library?type=DATASET`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const getSharedLibData = await getSharedLibRes.json();
    assert(
      getSharedLibRes.status === 200 && getSharedLibData.resources.length > 0,
      "Shared Library lists published research datasets"
    );

    // -----------------------------------------------------------------
    // TEST 19: Discussions & Comments
    // -----------------------------------------------------------------
    console.log("\n--- 11. Collaboration & Discussions ---");
    const createCommentRes = await fetch(`${BASE_URL}/api/collaboration/repository/${repoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        body: "Should we benchmark against DenseNet-121 or ViT?",
        type: "QUESTION",
      }),
    });
    assert(createCommentRes.status === 201, "Student posts discussion question in project");

    const getCommentsRes = await fetch(`${BASE_URL}/api/collaboration/repository/${repoId}`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const getCommentsData = await getCommentsRes.json();
    assert(
      getCommentsRes.status === 200 && getCommentsData.comments.length > 0,
      "Faculty retrieves project discussions feed"
    );

    // -----------------------------------------------------------------
    // TEST 20: Notifications
    // -----------------------------------------------------------------
    console.log("\n--- 12. Notifications ---");
    const getNotificationsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getNotificationsData = await getNotificationsRes.json();
    assert(
      getNotificationsRes.status === 200 && getNotificationsData.notifications.length > 0,
      "Notifications generated and listed for user events"
    );

    // -----------------------------------------------------------------
    // TEST 21 & 22: Negative / Security Tests
    // -----------------------------------------------------------------
    console.log("\n--- 13. Security & Authorization Negative Tests ---");
    // Negative 1: Student attempting to evaluate marks
    const studentEvalRes = await fetch(`${BASE_URL}/api/submissions/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        repositoryId: repoId,
        studentId: studentId,
        originalMarks: 100,
      }),
    });
    assert(studentEvalRes.status === 403, "Student cannot enter academic marks (403 Forbidden)");

    // Negative 2: Student attempting to create milestone
    const studentMsRes = await fetch(`${BASE_URL}/api/milestones/repository/${repoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ title: "Unauthorized Milestone", weight: 10, deadline: new Date().toISOString() }),
    });
    assert(studentMsRes.status === 403, "Student cannot create milestones (403 Forbidden)");

    // Negative 3: Unauthenticated request
    const unauthRes = await fetch(`${BASE_URL}/api/repositories`);
    assert(unauthRes.status === 401, "Missing authentication token returns 401 Unauthorized");

  } finally {
    server.close();
  }

  console.log("\n==========================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
