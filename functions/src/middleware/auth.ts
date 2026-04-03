import * as admin from "firebase-admin";
import { type Request } from "firebase-functions/v2/https";
import type express from "express";

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export async function verifyAuth(
  req: AuthenticatedRequest,
  res: express.Response,
): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing auth token" } });
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return decoded;
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid auth token" } });
    return null;
  }
}

export async function verifyAdmin(
  req: AuthenticatedRequest,
  res: express.Response,
): Promise<admin.auth.DecodedIdToken | null> {
  const decoded = await verifyAuth(req, res);
  if (!decoded) return null;

  if (decoded.admin !== true) {
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
    return null;
  }
  return decoded;
}
