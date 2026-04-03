import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround for React 18/19 type mismatch from transitive deps
const TypedStack = Stack as any as React.FC<{ screenOptions?: Record<string, unknown>; children?: React.ReactNode }> & {
  Screen: React.FC<{ name: string; options?: Record<string, unknown> }>;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <TypedStack screenOptions={{ headerShown: false }}>
        <TypedStack.Screen name="index" />
        <TypedStack.Screen name="(auth)" options={{ headerShown: false }} />
        <TypedStack.Screen name="(app)" options={{ headerShown: false }} />
      </TypedStack>
    </AuthProvider>
  );
}
