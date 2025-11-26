import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveStoragePath() {
  const customPath = process.env.DB_PATH;
  if (!customPath) {
    return path.resolve(__dirname, "../../data/database.sqlite");
  }

  return path.isAbsolute(customPath)
    ? customPath
    : path.resolve(process.cwd(), customPath);
}

function resolveLogging() {
  if (process.env.DB_LOGGING === "true") {
    return console.log;
  }

  if (process.env.DB_LOGGING === "false") {
    return false;
  }

  // Preserve original verbose logging by default.
  return console.log;
}

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: resolveStoragePath(),
  logging: resolveLogging(),
});
