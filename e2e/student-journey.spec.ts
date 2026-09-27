import { expect, test } from "@playwright/test";

const REQUIRED_OBSERVATIONS = [
  /list each component/i,
  /why is the resistor needed/i,
  /did the led light when the circuit was completed/i,
];

const OPTIONAL_OBSERVATIONS = [/what you checked first/i];

test("student completes an experiment end to end", async ({ page }) => {
  const tag = Date.now();
  const email = `e2e-student-${tag}@example.com`;

  // Register (student is the default role).
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Student");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard\/student$/);

  // Discover and open the seeded experiment.
  await page.getByRole("link", { name: "Browse all" }).click();
  await expect(page).toHaveURL(/\/dashboard\/student\/experiments$/);
  await page.getByRole("link", { name: "View experiment" }).first().click();
  await expect(page.getByRole("heading", { name: "Building a Simple Electrical Circuit" })).toBeVisible();

  // Start and enter the workspace.
  await page.getByRole("button", { name: /start experiment/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/student\/attempts\//);
  await expect(page.getByText("STEP 1 OF 5")).toBeVisible();

  // AI help falls back without a key and never blocks the workflow.
  await page.getByRole("button", { name: /need help with this step/i }).click();
  await page.getByPlaceholder(/stuck\? ask about this step/i).fill("My LED isn't lighting.");
  await page.getByRole("button", { name: "Ask for help" }).click();
  await expect(page.getByText("OFFLINE HELP")).toBeVisible();

  // Steps: fill every visible observation box, then one action saves
  // everything and advances. Synchronize on the step heading after each
  // click — renders can lag a click behind, and completions are idempotent.
  for (let round = 1; round <= 12; round++) {
    if ((await page.getByText("ASSESSMENT").count()) > 0) break;
    for (const prompt of [...REQUIRED_OBSERVATIONS, ...OPTIONAL_OBSERVATIONS]) {
      const box = page.getByLabel(prompt);
      if ((await box.count()) > 0 && ((await box.inputValue()) ?? "").trim().length === 0) {
        await box.fill(`E2E observation round ${round}.`);
      }
    }
    const before = await page.locator("h2#step-title").textContent().catch(() => null);
    await page.getByRole("button", { name: /save & continue/i }).click();
    await page.waitForFunction(
      (prev) =>
        (document.body.textContent ?? "").includes("ASSESSMENT") ||
        document.getElementById("step-title")?.textContent !== prev,
      before,
      { timeout: 20000 },
    );
  }

  // Assessment appears once all steps are done.
  await expect(page.getByText("ASSESSMENT")).toBeVisible();
  await page.getByRole("radio", { name: "To limit current so the LED is not damaged" }).check();
  await page.getByRole("radio", { name: "A complete loop that allows current to flow" }).check();
  await page.getByLabel(/two things you would check/i).fill("I would check the LED polarity and connections.");
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText("SCORE")).toBeVisible();

  // Complete and review the result.
  await page.getByRole("button", { name: /complete experiment/i }).click();
  // Pin to the result card's own status row: bare "Completed" also matches
  // step pills, which would let an unfinished completion slip through.
  await expect(
    page.locator("dl", { hasText: "Score" }).getByText("Completed", { exact: true }),
  ).toBeVisible();

  // Dashboard reflects the completed work.
  await page.goto("/dashboard/student");
  await expect(page.getByText("Recently completed")).toBeVisible();
  await expect(page.getByText("Building a Simple Electrical Circuit").first()).toBeVisible();
});
