import db from "../models/index.mjs";
import logger from "../shared/logging/logger.mjs";

const OFFICE_STAFF_MAPPING = {
  1: ["tech_water"], // Water Infrastructure
  2: ["tech_mobility"], // Accessibility
  3: ["tech_sewer"], // Sewerage
  4: ["tech_lighting"], // Lighting
  5: ["tech_waste"], // Waste
  6: ["tech_traffic"], // Traffic
  7: ["tech_roads"], // Roads
  8: ["tech_green"], // Parks
  9: ["tech_general"], // General Services
};

export const seedUserTechnicalOffices = async () => {
  try {
    const count = await db.UserTechOffice.count();
    if (count > 0) {
      return;
    }

    logger.info("Starting seeding of User-TechnicalOffice associations...");

    const userOfficePayload = [];

    for (const [officeId, usernames] of Object.entries(OFFICE_STAFF_MAPPING)) {
      const users = await db.User.findAll({
        where: { username: usernames },
        attributes: ["id", "username"],
      });

      if (users.length === 0) {
        logger.warn(`No users found for Office ID ${officeId}`);
        continue;
      }

      users.forEach((user) => {
        userOfficePayload.push({
          user_id: user.id,
          tech_office_id: parseInt(officeId),
        });
      });
    }

    // 5. Inserimento massivo
    if (userOfficePayload.length > 0) {
      await db.UserTechOffice.bulkCreate(userOfficePayload);
      logger.info(
        `Successfully assigned offices to ${userOfficePayload.length} staff members.`
      );
    } else {
      logger.warn("No office associations created.");
    }
  } catch (err) {
    logger.error("Error seeding UserTechnicalOffices:", err);
    throw err;
  }
};
