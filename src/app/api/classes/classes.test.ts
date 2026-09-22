import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { handleRegister } from "@/lib/auth-service";
import {
  handleCreateClass,
  handleGetClass,
  handleJoinClass,
  handleJoinedClasses,
  handleListClasses,
  handleRemoveMember,
} from "@/lib/classes-service";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();

function authed(path: string, cookie: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
  });
}

async function registerAs(role: "STUDENT" | "TEACHER", tag: string) {
  const email = `class-${tag}-${stamp}@example.com`;
  const res = await handleRegister(
    role,
    new Request(`http://localhost/api/auth/register/${role.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tag, email, password: "password123" }),
    }),
  );
  expect(res.status).toBe(201);
  // getRequestSession reads the session cookie; carry it on later calls.
  const cookie = res.headers.getSetCookie()[0]?.split(";")[0] ?? "";
  return { email, authed: (path: string, init?: RequestInit) => authed(path, cookie, init) };
}

// FR-TEA-05–FR-TEA-14 end-to-end against real PostgreSQL.
describe.skipIf(!hasDb)("classes and membership", () => {
  afterAll(async () => {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `class-%-${stamp}@example.com`));
    for (const u of found) {
      const memberships = await db
        .select({ classId: classMemberships.classId })
        .from(classMemberships)
        .where(eq(classMemberships.studentId, u.id));
      await db.delete(classMemberships).where(eq(classMemberships.studentId, u.id));
      for (const m of memberships) {
        await db
          .delete(classMemberships)
          .where(eq(classMemberships.classId, m.classId));
        await db.delete(classes).where(eq(classes.id, m.classId));
      }
      const owned = await db.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, u.id));
      for (const c of owned) {
        await db.delete(classMemberships).where(eq(classMemberships.classId, c.id));
        await db.delete(classes).where(eq(classes.id, c.id));
      }
      await db.delete(users).where(eq(users.id, u.id));
    }
  });

  it("teacher creates a class, student joins by code, duplicate join refused", async () => {
    const teacher = await registerAs("TEACHER", "t1");
    const student = await registerAs("STUDENT", "s1");

    const created = await handleCreateClass(
      teacher.authed("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Physics 101" }),
      }),
    );
    expect(created.status).toBe(201);
    const { class: cls } = (await created.json()) as { class: { id: string; code: string } };
    expect(cls.code).toHaveLength(6);

    const joined = await handleJoinClass(
      student.authed("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cls.code.toLowerCase() }),
      }),
    );
    expect(joined.status).toBe(201);

    const duplicate = await handleJoinClass(
      student.authed("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cls.code }),
      }),
    );
    expect(duplicate.status).toBe(409);

    const badCode = await handleJoinClass(
      student.authed("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "XXXXXX" }),
      }),
    );
    expect(badCode.status).toBe(404);
  });

  it("enforces teacher ownership and preserves history on removal", async () => {
    const teacherA = await registerAs("TEACHER", "ta");
    const teacherB = await registerAs("TEACHER", "tb");
    const student = await registerAs("STUDENT", "s2");

    const created = await handleCreateClass(
      teacherA.authed("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Chemistry" }),
      }),
    );
    const { class: cls } = (await created.json()) as { class: { id: string; code: string } };

    // Non-owner reads and writes denied.
    expect((await handleGetClass(teacherB.authed(`/api/classes/${cls.id}`), cls.id)).status).toBe(404);
    expect((await handleListClasses(teacherB.authed("/api/classes"))).status).toBe(200);
    const otherList = (await (await handleListClasses(teacherB.authed("/api/classes"))).json()) as {
      classes: unknown[];
    };
    expect(otherList.classes).toHaveLength(0);

    // Student joins, teacher removes, history row preserved as inactive.
    await handleJoinClass(
      student.authed("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cls.code }),
      }),
    );
    const [studentRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, `class-s2-${stamp}@example.com`))
      .limit(1);
    const removed = await handleRemoveMember(
      teacherA.authed(`/api/classes/${cls.id}/members/${studentRow.id}`, { method: "DELETE" }),
      cls.id,
      studentRow.id,
    );
    expect(removed.status).toBe(200);

    const history = await db
      .select()
      .from(classMemberships)
      .where(
        or(
          eq(classMemberships.studentId, studentRow.id),
        ),
      );
    expect(history.length).toBe(1);
    expect(history[0].active).toBe(false);

    // Removed student sees no classes; owner sees empty member list.
    const joined = (await (await handleJoinedClasses(student.authed("/api/classes/joined"))).json()) as {
      classes: unknown[];
    };
    expect(joined.classes).toHaveLength(0);
    const detail = (await (await handleGetClass(teacherA.authed(`/api/classes/${cls.id}`), cls.id)).json()) as {
      members: unknown[];
    };
    expect(detail.members).toHaveLength(0);
  });

  it("refuses student-only and unauthenticated access to teacher routes", async () => {
    const student = await registerAs("STUDENT", "s3");
    expect(
      (
        await handleCreateClass(
          student.authed("/api/classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Nope" }),
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleListClasses(new Request("http://localhost/api/classes"))).status,
    ).toBe(403);
  });
});
