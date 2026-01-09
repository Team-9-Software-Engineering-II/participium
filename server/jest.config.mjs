// server/jest.config.mjs
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.{js,mjs}"], // Cerca i file nella tua cartella tests
  transform: {}, // Non serve trasformazione per file .mjs nativi
  verbose: true,
};
