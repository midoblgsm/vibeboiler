const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes in shared packages
config.watchFolders = [monorepoRoot];

// Resolve modules from both the project and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Explicitly map workspace packages so Metro can resolve them
// even when pnpm symlinks aren't followed correctly in CI
config.resolver.extraNodeModules = {
  "@vibeboiler/shared": path.resolve(monorepoRoot, "packages/shared"),
};

module.exports = config;
