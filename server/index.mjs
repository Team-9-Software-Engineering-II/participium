import express from "express";
import fs from "fs";
import morgan from "morgan";
import session from "express-session";
import db from "./models/index.mjs";
import router from "./routers/index.js";
import { passport } from "./services/passport-service.mjs";
import cors from "cors";
import { seedDatabase } from "./seeders/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Applies core middlewares required by the application.
 */
function bootstrapExpress() {
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use(express.static(path.join(__dirname, "public")));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "participium-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, //process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(router);
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

/**
 * Handles application level errors and provides consistent responses.
 */
function registerErrorHandlers() {
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode >= 500
        ? "An unexpected error occurred. Please try again later."
        : err.message;

    console.error(err);
    res.status(statusCode).json({ message });
  });
}

bootstrapExpress();

registerErrorHandlers();

db.sequelize
  .sync({ force: false })
  .then(async () => {
    console.log("Database synced successfully.");

    await seedDatabase();

    // <-- FINE MODIFICA

    app.listen(3000, () => {
      console.log(`Server listening on port 3000`);
    });
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });

export { app };
