import { defineConfig } from "cypress";
import db from "./server/models/index.mjs"
import { seedUsers } from "./server/seeders/seed-users.mjs"

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      on("task", {
        async resetDb() {
          try {
            await db.sequelize.sync({ force: true });
            await seedUsers();
            console.log("Database reset and seeded successfully");
            return null;
          } catch (err) {
            console.error("Error resetting DB:", err);
            throw err;
          }
        },
      });

      return config;
    },
  },
});
