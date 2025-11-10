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

/**
 * Seeds the database with initial data if tables are empty.
 */
async function seedDatabase() {
  try {
    // Seed roles if the table is empty
    const roleCount = await db.Role.count();
    if (roleCount === 0) {
      await db.Role.bulkCreate([
        { id: 1, name: 'citizen' },
        { id: 2, name: 'admin' },
        { id: 3, name: 'municipality_public_relations_officer' },
        { id: 4, name: 'technical_staff' }
      ]);
      console.log("Roles seeded successfully.");
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}

bootstrapExpress();
registerErrorHandlers();

db.sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log("Database synced successfully.");
    
    // Seed initial data
    await seedDatabase();

    // Start the Express server only after the DB connection is ready
    app.listen(3000, () => {
      console.log("Server listening on port 3000");
    });
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });
