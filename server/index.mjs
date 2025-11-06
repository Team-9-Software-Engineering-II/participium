import express from "express";
import db from "./models/index.mjs";

const app = express();

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
