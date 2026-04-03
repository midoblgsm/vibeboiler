import * as admin from "firebase-admin";
import { neon } from "@neondatabase/serverless";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: set-admin.ts <email>");
    process.exit(1);
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.error("FIREBASE_SERVICE_ACCOUNT env var is required");
    process.exit(1);
  }

  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error("NEON_DATABASE_URL env var is required");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const userRecord = await admin.auth().getUserByEmail(email);
  console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

  await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
  console.log("Set admin custom claim on Firebase Auth");

  const sql = neon(databaseUrl);
  await sql`UPDATE users SET role = 'admin', updated_at = now() WHERE firebase_uid = ${userRecord.uid}`;
  console.log("Updated role in database");

  console.log(`Successfully promoted ${email} to admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to set admin:", err);
  process.exit(1);
});
