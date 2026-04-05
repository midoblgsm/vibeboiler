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

// Explicitly map workspace packages and ensure critical modules
// resolve from the project's own node_modules to prevent duplicates
config.resolver.extraNodeModules = {
  "@vibeboiler/shared": path.resolve(monorepoRoot, "packages/shared"),
};

// Block Metro from crawling web app and functions directories
config.resolver.blockList = [
  /apps\/web\/.*/,
  /functions\/.*/,
];

module.exports = config;
