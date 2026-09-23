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

  // Five steps: fill every visible observation box, save each, then complete.
  for (let step = 1; step <= 5; step++) {
    await expect(page.getByText(`STEP ${step} OF 5`)).toBeVisible();
    for (const prompt of [...REQUIRED_OBSERVATIONS, ...OPTIONAL_OBSERVATIONS]) {
      const box = page.getByLabel(prompt);
      if ((await box.count()) > 0 && ((await box.inputValue()) ?? "").trim().length === 0) {
        await box.fill(`E2E observation for step ${step}.`);
      }
    }
    for (;;) {
      const saveButtons = page.getByRole("button", { name: /record observation/i });
      if ((await saveButtons.count()) === 0) break;
      await saveButtons.first().click();
    }
    await page.getByRole("button", { name: /mark step complete/i }).click();
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
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

  // Dashboard reflects the completed work.
  await page.goto("/dashboard/student");
  await expect(page.getByText("Recently completed")).toBeVisible();
  await expect(page.getByText("Building a Simple Electrical Circuit").first()).toBeVisible();
});
