const IS_EAS_BUILD = process.env.EAS_BUILD === "true";

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "VibeBoiler",
  slug: "vibeboiler",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "vibeboiler",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.craftschoolship.vibeboiler",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.yourcompany.vibeboiler",
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "6eededb8-59ad-480b-90b1-1527783cc5bd",
    },
    FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    router: {
      origin: false,
    },
  },
  owner: "craftschoolship",
};

export default { expo: config };
