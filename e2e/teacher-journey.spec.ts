import { expect, test } from "@playwright/test";

test("teacher runs a class end to end with a student", async ({ browser }) => {
  const tag = Date.now();
  const teacherCtx = await browser.newContext();
  const studentCtx = await browser.newContext();
  const teacher = teacherCtx.pages()[0] ?? (await teacherCtx.newPage());
  const student = studentCtx.pages()[0] ?? (await studentCtx.newPage());

  // Teacher registers (Teacher radio) and creates a class.
  await teacher.goto("/register");
  await teacher.getByLabel("Full name").fill("E2E Teacher");
  await teacher.getByLabel("Email").fill(`e2e-teacher-${tag}@example.com`);
  await teacher.getByLabel("Password", { exact: true }).fill("password123");
  await teacher.getByLabel("Confirm password").fill("password123");
  await teacher.getByText("Teacher", { exact: true }).click();
  await teacher.getByRole("button", { name: "Create account" }).click();
  await expect(teacher).toHaveURL(/\/dashboard\/teacher$/);

  await teacher.getByRole("link", { name: "Classes", exact: true }).click();
  await teacher.getByLabel("Class name").fill(`E2E Physics ${tag}`);
  await teacher.getByRole("button", { name: /create class/i }).click();
  await expect(teacher).toHaveURL(/\/dashboard\/teacher\/classes\//);
  const classId = teacher.url().split("/").pop() ?? "";

  // Read the generated code through the teacher's own API (same session).
  const classesRes = await teacher.request.get("/api/classes");
  expect(classesRes.ok()).toBeTruthy();
  const classesJson = (await classesRes.json()) as { classes: { id: string; code: string }[] };
  const code = classesJson.classes.find((c) => c.id === classId)?.code ?? "";
  expect(code).toHaveLength(6);

  // Student registers and joins with the code.
  await student.goto("/register");
  await student.getByLabel("Full name").fill("E2E Learner");
  await student.getByLabel("Email").fill(`e2e-learner-${tag}@example.com`);
  await student.getByLabel("Password", { exact: true }).fill("password123");
  await student.getByLabel("Confirm password").fill("password123");
  await student.getByRole("button", { name: "Create account" }).click();
  await expect(student).toHaveURL(/\/dashboard\/student$/);

  await student.getByRole("link", { name: "My Classes" }).click();
  await student.getByLabel("Class code").fill(code);
  await student.getByRole("button", { name: "Join class" }).click();
  await expect(student.getByText(`E2E Physics ${tag}`)).toBeVisible();

  // Teacher assigns the seeded experiment.
  await teacher.getByRole("tab", { name: "Assignments" }).click();
  await teacher.getByLabel("Experiment").selectOption({ index: 1 });
  await teacher.getByRole("button", { name: "Assign experiment" }).click();
  await expect(
    teacher.locator("li", { hasText: "Building a Simple Electrical Circuit" }),
  ).toBeVisible();

  // Student sees assigned work and starts it from the detail page.
  await student.goto("/dashboard/student");
  await expect(student.getByText("Assigned work")).toBeVisible();
  await student.getByRole("link", { name: "Start" }).click();
  await student.getByRole("button", { name: /start experiment/i }).click();
  await expect(student).toHaveURL(/\/dashboard\/student\/attempts\//);

  // Teacher sees the student in progress, then inspects individual progress.
  await teacher.getByRole("tab", { name: "Progress" }).click();
  await expect(teacher.getByText("IN PROGRESS")).toBeVisible();
  await teacher.getByRole("tab", { name: "Students" }).click();
  await teacher.getByRole("link", { name: "Progress" }).click();
  await expect(teacher).toHaveURL(/\/students\//);
  await expect(teacher.getByText("IN PROGRESS")).toBeVisible();

  // Teacher closes the assignment; history is preserved.
  await teacher.goto(`/dashboard/teacher/classes/${classId}`);
  await teacher.getByRole("tab", { name: "Assignments" }).click();
  await teacher.getByRole("button", { name: /close/i }).first().click();
  await teacher.getByRole("button", { name: "Close", exact: true }).click();
  await expect(teacher.getByText("CLOSED")).toBeVisible();

  await teacherCtx.close();
  await studentCtx.close();
});
