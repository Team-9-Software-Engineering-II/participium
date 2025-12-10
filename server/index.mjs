import "dotenv/config"; // Load environment variables from .env file
import express from "express";
import fs from "fs";
import morgan from "morgan";
import session from "express-session";
import db from "./models/index.mjs";
import router from "./routers/index.js";
import { passport } from "./services/passport-service.mjs";
import cors from "cors";
import { seedDatabase } from "./seeders/index.mjs";
import path from "path";
import { fileURLToPath } from "url";
import { connectRedis } from "./config/redis.mjs";
import { initializeEmailTransporter } from "./config/email.mjs";
import { globalErrorHandler } from "./middlewares/error-handler.mjs";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 3000;
const shouldSeed = NODE_ENV !== "test" && process.env.SKIP_DB_SEED !== "true";
const forceSync =
  process.env.DB_SYNC_FORCE !== undefined
    ? process.env.DB_SYNC_FORCE === "true"
    : true;
const alterSync = !forceSync && process.env.DB_SYNC_ALTER === "true";
const syncOptions = {
  force: forceSync,
  alter: alterSync,
};
const clientBuildPath =
  process.env.CLIENT_BUILD_DIR || path.join(__dirname, "public");
const clientIndexPath = path.join(clientBuildPath, "index.html");
const hasClientBuild =
  fs.existsSync(clientBuildPath) && fs.existsSync(clientIndexPath);
const corsValue =
  process.env.CLIENT_ORIGIN ||
  (NODE_ENV === "production"
    ? `http://localhost:${PORT}`
    : "http://localhost:5173");
const corsOrigin =
  corsValue === "*"
    ? true
    : corsValue
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
const sessionCookieSecure = (() => {
  if (process.env.SESSION_COOKIE_SECURE === "true") {
    return true;
  }
  if (process.env.SESSION_COOKIE_SECURE === "false") {
    return false;
  }
  return NODE_ENV === "production";
})();
const sessionSameSite = process.env.SESSION_COOKIE_SAMESITE || "lax";

/**
 * Applies core middlewares required by the application.
 */
function bootstrapExpress() {
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  if (hasClientBuild) {
    app.use(express.static(clientBuildPath));
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "participium-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: sessionCookieSecure,
        sameSite: sessionSameSite,
        maxAge: 1000 * 60 * 60 * 24,
        path: "/",
        domain: undefined, // Let browser handle domain for same-origin
      },
      name: "connect.sid",
      proxy: false, // Not behind a proxy in Docker
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware for session tracking (only in non-production)
  if (NODE_ENV !== "production") {
    app.use((req, res, next) => {
      console.log(
        `[${req.method}] ${
          req.path
        } - Authenticated: ${req.isAuthenticated()}, User: ${
          req.user?.username || "none"
        }`
      );
      next();
    });
  }
}

bootstrapExpress();
app.use(router);

if (hasClientBuild) {
  app.get(/.*/, (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.use(globalErrorHandler);

db.sequelize
  .sync(syncOptions)
  .then(async () => {
    console.log("Database synced successfully.");

    if (shouldSeed) {
      console.log("Running database seeder...");
      await seedDatabase();
    }

    await connectRedis();
    await initializeEmailTransporter();

    if (NODE_ENV !== "test") {
      if (NODE_ENV == "production") {
        app.listen(PORT, () => {
          console.log(`Server in production listening on port ${PORT}`);
        });
      } else
        app.listen(PORT, () => {
          console.log(`Server in development listening on port ${PORT}`);
        });
    }
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });

export { app };
