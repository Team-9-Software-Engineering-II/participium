import express from "express";
import morgan from "morgan";
import session from "express-session";
import db from "./models/index.mjs";
import router from "./routers/index.js";
import { passport } from "./services/passport-service.mjs";
import cors from "cors";

const app = express();

/**
 * Applies core middlewares required by the application.
 */
function bootstrapExpress() {
  app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
  }));
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "participium-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24,
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(router);
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
  .sync({ alter: true })
  .then(() => {
    console.log("Database synced successfully.");

    // Start the Express server only after the DB connection is ready
    app.listen(3000, () => {
      console.log("Server listening on port 3000");
    });
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });
