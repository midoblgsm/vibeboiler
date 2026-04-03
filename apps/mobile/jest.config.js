module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!(.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|@react-native/.*)|(.pnpm/[^/]+/node_modules/)?(expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@vibeboiler/shared))",
  ],
  moduleNameMapper: {
    "^@vibeboiler/shared$": "<rootDir>/../../packages/shared/src",
  },
};
