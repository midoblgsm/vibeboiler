export interface EnvInputs {
  firebase: {
    projectId: string;
    apiKey: string;
    authDomain: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  neonConnectionUri?: string;
  serviceAccountJsonPath?: string;
}

/**
 * Produce a .env file populated from collected state. Matches the fields in
 * .env.example (see repository root).
 */
export function renderEnvFile(inputs: EnvInputs): string {
  const saPath = inputs.serviceAccountJsonPath ?? "./.vibeboiler/service-account.json";
  const lines = [
    "# Firebase Configuration (Web)",
    `VITE_FIREBASE_API_KEY=${inputs.firebase.apiKey}`,
    `VITE_FIREBASE_AUTH_DOMAIN=${inputs.firebase.authDomain}`,
    `VITE_FIREBASE_PROJECT_ID=${inputs.firebase.projectId}`,
    `VITE_FIREBASE_STORAGE_BUCKET=${inputs.firebase.storageBucket}`,
    `VITE_FIREBASE_MESSAGING_SENDER_ID=${inputs.firebase.messagingSenderId}`,
    `VITE_FIREBASE_APP_ID=${inputs.firebase.appId}`,
    "",
    "# Firebase Configuration (Mobile)",
    `FIREBASE_API_KEY=${inputs.firebase.apiKey}`,
    "",
    "# Neon Postgres (used by Firebase Functions)",
    `NEON_DATABASE_URL=${inputs.neonConnectionUri ?? ""}`,
    "",
    "# Firebase Admin (Functions runtime)",
    `GOOGLE_APPLICATION_CREDENTIALS=${saPath}`,
    "",
    "# Expo",
    `EXPO_PUBLIC_FIREBASE_API_KEY=${inputs.firebase.apiKey}`,
    "",
  ];
  return lines.join("\n");
}
