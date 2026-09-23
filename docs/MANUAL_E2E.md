# ScienceLab Manual End-to-End Testing (Human Version)

Run this before any pilot, demo, or release. Use two browsers (or a normal
plus a private window): one Teacher, one Student. The seeded experiment is
"Building a Simple Electrical Circuit". Mark each row pass/fail as you go.

## 0. Preconditions

- [ ] App loads at its URL; landing page renders with Learn/Start actions.
- [ ] `/api/health/db` returns `{"status":"ok"}`.
- [ ] A published experiment exists in the catalogue.

## 1. Accounts and access

| # | Steps | Expected |
|---|---|---|
| 1.1 | Register as a student (name, email, password ≥ 8, confirm match, Student card). | Lands on the student dashboard, authenticated. |
| 1.2 | Register as a teacher with the same email. | Refused: account already exists. |
| 1.3 | Register as a teacher with a new email (Teacher card). | Lands on the teacher dashboard. |
| 1.4 | Log out, log in with a wrong password. | Generic "Invalid email or password", no hint which field failed. |
| 1.5 | Log in as the student; open `/dashboard/teacher` directly. | Redirected to the student dashboard (and vice versa). |
| 1.6 | Logged out, open any `/dashboard/*` page. | Redirected to login. |
| 1.7 | Student: account menu → Change password (wrong current, then correct). | Wrong current refused; correct changes it; login works with the new one. |

## 2. Classes and joining

| # | Steps | Expected |
|---|---|---|
| 2.1 | Teacher: Classes → create "Physics 101" (name only). | Detail page shows a 6-character code. |
| 2.2 | Student: My Classes → paste the code → Join. | Class appears with teacher name and join date. |
| 2.3 | Student: join the same class again. | "Already a member", no duplicate. |
| 2.4 | Student: join with a bad code. | Clear invalid-code error. |
| 2.5 | Student: join a second class with another code. | Both classes listed (join-another box visible after the first). |
| 2.6 | Student: Leave the second class, then rejoin with its code. | Leaves cleanly; rejoin works; learning history untouched. |

## 3. Teacher assignments

| # | Steps | Expected |
|---|---|---|
| 3.1 | Teacher: class → Assignments → assign the circuit (no dates). | Row appears `ACTIVE` with the experiment title. |
| 3.2 | Assign the same experiment again. | Refused: already assigned. |
| 3.3 | Edit dates (due before start). | Refused with a clear message. |
| 3.4 | Set a valid due date. | Saved and shown. |

## 4. Student experiment run (assigned)

| # | Steps | Expected |
|---|---|---|
| 4.1 | Student dashboard shows Assigned work with the circuit. | Status Not Started; Start link present. |
| 4.2 | Open the experiment, read objectives/materials/safety, Start. | Workspace opens at Step 1 of 5. |
| 4.3 | Jump to Step 3 via the dots, then press "Mark step complete". | Review allowed; completion refused with "Complete step 1 first". |
| 4.4 | Complete Step 1, record the required observation, continue through all 5 steps. | Progress trace advances; observations editable while in progress. |
| 4.5 | AI Help: expand, ask "My LED isn't lighting". | Contextual troubleshooting (or OFFLINE HELP fallback without a key); navigation never blocked. |
| 4.6 | Assessment appears; answer all, Submit. | Score + feedback shown; Submit locks (no resubmit). |
| 4.7 | Complete experiment. | Status COMPLETED; dashboard Recently completed lists it with the score. |
| 4.8 | Try editing an observation and resubmitting. | Both refused — completed work is read-only. |

## 5. Gating and independence

| # | Steps | Expected |
|---|---|---|
| 5.1 | With the assignment incomplete (fresh student 2, same class): catalogue → another experiment → Start. | Refused: finish assigned work first. |
| 5.2 | Start the assigned experiment instead. | Allowed — assigned work is always startable. |
| 5.3 | Teacher closes the assignment. | Student can now start independent experiments; history preserved. |

## 6. Teacher monitoring

| # | Steps | Expected |
|---|---|---|
| 6.1 | Class → Progress tab. | Counts read Total / Not Started / In Progress / Completed. |
| 6.2 | Students tab → Progress for the student. | Steps, observations, score, dates; includes independent work. |
| 6.3 | Teacher 2 (new account) opens class/progress URLs of teacher 1. | Denied — class isolation holds. |
| 6.4 | Remove the student from the class. | Membership ends; attempts/observations/results still visible in history. |

## 7. Teacher experiment creation

| # | Steps | Expected |
|---|---|---|
| 7.1 | Teacher: Experiments → New experiment → fill all sections (2 steps, 1 required observation, 1 MCQ + 1 short answer) → Publish. | Preview page shows the full package. |
| 7.2 | Submit with an empty step title / MCQ correct answer not matching any option. | Field-level refusal, nothing saved. |
| 7.3 | Student catalogue shows the new experiment; assign it to the class. | Assignable and startable like seeded content. |

## 8. Password recovery

| # | Steps | Expected |
|---|---|---|
| 8.1 | Logged out → Forgot password → submit the student email. | Identical confirmation message (check Mailpit `localhost:8025` in dev, Brevo inbox in prod). |
| 8.2 | Submit an unknown email. | Identical message — no enumeration. |
| 8.3 | Open the reset link, set a new password, log in. | Works; reuse of the link refused. |

## 9. Finish

- [ ] No test accounts, classes, or attempts left behind (delete via owning UI where possible).
- [ ] Note any failure with: page, action, expected vs actual, browser, timestamp.
- [ ] File failures as issues against the relevant requirement ID (`FR-*`/`CR-*`).
