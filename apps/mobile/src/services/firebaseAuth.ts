import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { AuthTokens, FirebaseAuthError } from "@vibeboiler/shared";

const FIREBASE_API_KEY =
  Constants.expoConfig?.extra?.FIREBASE_API_KEY ?? "";
const AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts";
const TOKEN_REFRESH_URL = "https://securetoken.googleapis.com/v1/token";

const TOKEN_KEY = "auth_tokens";

async function firebaseAuthRequest(
  endpoint: string,
  body: Record<string, string | boolean>,
): Promise<AuthTokens> {
  const response = await fetch(
    `${AUTH_BASE_URL}:${endpoint}?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorData = (await response.json()) as FirebaseAuthError;
    throw new Error(errorData.error.message);
  }

  const data = await response.json();
  const tokens: AuthTokens = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };

  await saveTokens(tokens);
  return tokens;
}

export async function signUp(
  email: string,
  password: string,
): Promise<AuthTokens> {
  return firebaseAuthRequest("signUp", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthTokens> {
  return firebaseAuthRequest("signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(
    `${AUTH_BASE_URL}:sendOobCode?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    },
  );

  if (!response.ok) {
    const errorData = (await response.json()) as FirebaseAuthError;
    throw new Error(errorData.error.message);
  }
}

export async function refreshToken(
  refreshTokenValue: string,
): Promise<AuthTokens> {
  const response = await fetch(
    `${TOKEN_REFRESH_URL}?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  const tokens: AuthTokens = {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };

  await saveTokens(tokens);
  return tokens;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as AuthTokens;
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
