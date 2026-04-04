import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../db/schema";
import { verifyAdmin, type AuthenticatedRequest } from "../middleware/auth";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

interface AdminUserEntry {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
}

export const listUsers = onRequest({ cors: true, secrets: ["NEON_DATABASE_URL"] }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use GET" } });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  const decoded = await verifyAdmin(authReq, res);
  if (!decoded) return;

  const db = getDb();
  const rows = await db.select().from(users);

  const data: AdminUserEntry[] = rows.map((row) => ({
    uid: row.firebaseUid,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  }));

  const response: ApiResponse<AdminUserEntry[]> = { success: true, data };
  res.json(response);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

export const createUser = onRequest({ cors: true, secrets: ["NEON_DATABASE_URL"] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  const decoded = await verifyAdmin(authReq, res);
  if (!decoded) return;

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
    };
    res.status(400).json(response);
    return;
  }

  const { email, password, displayName, role } = parsed.data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName ?? undefined,
    });

    if (role === "admin") {
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    }

    const db = getDb();
    const [inserted] = await db
      .insert(users)
      .values({
        firebaseUid: userRecord.uid,
        email,
        displayName: displayName ?? null,
        role,
      })
      .returning();

    const data: AdminUserEntry = {
      uid: userRecord.uid,
      email,
      displayName: displayName ?? null,
      role,
      createdAt: inserted.createdAt.toISOString(),
    };

    const response: ApiResponse<AdminUserEntry> = { success: true, data };
    res.status(201).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    const response: ApiResponse = {
      success: false,
      error: { code: "CREATE_FAILED", message },
    };
    res.status(400).json(response);
  }
});

const deleteUserSchema = z.object({
  uid: z.string().min(1),
});

export const deleteUser = onRequest({ cors: true, secrets: ["NEON_DATABASE_URL"] }, async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use DELETE" } });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  const decoded = await verifyAdmin(authReq, res);
  if (!decoded) return;

  const parsed = deleteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
    };
    res.status(400).json(response);
    return;
  }

  const { uid } = parsed.data;

  if (decoded.uid === uid) {
    const response: ApiResponse = {
      success: false,
      error: { code: "FORBIDDEN", message: "Cannot delete your own account" },
    };
    res.status(400).json(response);
    return;
  }

  try {
    const db = getDb();
    await db.delete(users).where(eq(users.firebaseUid, uid));
    await admin.auth().deleteUser(uid);

    const response: ApiResponse<{ deleted: true }> = { success: true, data: { deleted: true } };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    const response: ApiResponse = {
      success: false,
      error: { code: "DELETE_FAILED", message },
    };
    res.status(400).json(response);
  }
});

const setUserRoleSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(["user", "admin"]),
});

export const setUserRole = onRequest({ cors: true, secrets: ["NEON_DATABASE_URL"] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  const decoded = await verifyAdmin(authReq, res);
  if (!decoded) return;

  const parsed = setUserRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
    };
    res.status(400).json(response);
    return;
  }

  const { uid, role } = parsed.data;

  if (decoded.uid === uid && role !== "admin") {
    const response: ApiResponse = {
      success: false,
      error: { code: "FORBIDDEN", message: "Cannot remove your own admin role" },
    };
    res.status(400).json(response);
    return;
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: role === "admin" });

    const db = getDb();
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.firebaseUid, uid));

    const response: ApiResponse<{ uid: string; role: string }> = {
      success: true,
      data: { uid, role },
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role";
    const response: ApiResponse = {
      success: false,
      error: { code: "UPDATE_FAILED", message },
    };
    res.status(400).json(response);
  }
});
