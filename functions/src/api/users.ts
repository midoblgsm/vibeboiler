import { onRequest } from "firebase-functions/v2/https";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../db/schema";
import { verifyAuth, type AuthenticatedRequest } from "../middleware/auth";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
}

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
});

export const getProfile = onRequest({ secrets: ["NEON_DATABASE_URL"] }, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const decoded = await verifyAuth(authReq, res);
  if (!decoded) return;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  if (!user) {
    const response: ApiResponse = {
      success: false,
      error: { code: "NOT_FOUND", message: "User profile not found" },
    };
    res.status(404).json(response);
    return;
  }

  const profile: UserProfile = {
    uid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };

  const response: ApiResponse<UserProfile> = { success: true, data: profile };
  res.json(response);
});

export const updateProfile = onRequest({ secrets: ["NEON_DATABASE_URL"] }, async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use PUT or PATCH" } });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  const decoded = await verifyAuth(authReq, res);
  if (!decoded) return;

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
    };
    res.status(400).json(response);
    return;
  }

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.firebaseUid, decoded.uid))
    .returning();

  if (!updated) {
    const response: ApiResponse = {
      success: false,
      error: { code: "NOT_FOUND", message: "User profile not found" },
    };
    res.status(404).json(response);
    return;
  }

  const profile: UserProfile = {
    uid: updated.firebaseUid,
    email: updated.email,
    displayName: updated.displayName,
    bio: updated.bio,
    avatarUrl: updated.avatarUrl,
    role: updated.role,
  };

  const response: ApiResponse<UserProfile> = { success: true, data: profile };
  res.json(response);
});
