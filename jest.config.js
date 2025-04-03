/** @type {import('jest').Config} */
const config = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: ["**/__tests__/**/*.+(ts|tsx)", "**/?(*.)+(spec|test).+(ts|tsx)"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  // For Node-based projects:
  testEnvironment: "node",
};

module.exports = config;
