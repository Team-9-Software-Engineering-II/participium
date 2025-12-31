import db from "../models/index.mjs";
import logger from "../shared/logging/logger.mjs";

/**
 * Role 1: Citizen
 * Role 2: Admin
 * Role 3: Municipal Officer
 * Role 4: Technical Staff
 * Role 5: External Maintainer
 */
const ROLES_MAPPING = {
  1: ["mario.rossi", "anna.neri", "paolo.gialli", "test"],
  2: ["admin"],
  3: ["pr_officer"],
  4: [
    "tech_water",
    "tech_mobility",
    "tech_sewer",
    "tech_lighting",
    "tech_waste",
    "tech_traffic",
    "tech_roads",
    "tech_green",
    "tech_general",
  ],
  5: [
    "em_water_smat",
    "em_light_iren",
    "em_waste_amiat",
    "em_traffic_gtt",
    "em_urban_services",
  ],
};

export const seedUserRoles = async () => {
  try {
    // 1. Verifica se ci sono già associazioni per evitare duplicati
    const count = await db.UserRole.count();
    if (count > 0) {
      return;
    }

    logger.info("Starting seeding of User-Role associations...");

    const userRolesPayload = [];

    // 2. Itera su ogni ruolo definito nella mappa
    // Object.entries restituisce coppie [roleId, [username1, username2...]]
    for (const [roleId, usernames] of Object.entries(ROLES_MAPPING)) {
      // 3. Trova gli utenti nel DB che corrispondono a questi username
      const users = await db.User.findAll({
        where: {
          username: usernames,
        },
        attributes: ["id", "username"], // Prendiamo solo l'ID
      });

      if (users.length === 0) {
        logger.warn(`No users found for Role ID ${roleId}`);
        continue;
      }

      // 4. Prepara l'oggetto per la tabella ponte
      users.forEach((user) => {
        userRolesPayload.push({
          user_id: user.id, // Assicurati che corrisponda alla foreignKey definita nel model UserRole
          role_id: parseInt(roleId), // Assicurati che corrisponda alla foreignKey definita nel model UserRole
        });
      });
    }

    // 5. Inserimento massivo (Bulk Insert) nella tabella pivot
    if (userRolesPayload.length > 0) {
      await db.UserRole.bulkCreate(userRolesPayload);
      logger.info(
        `Successfully assigned roles to ${userRolesPayload.length} users.`
      );
    } else {
      logger.warn("No associations created.");
    }
  } catch (err) {
    logger.error("Error seeding UserRoles:", err);
    throw err;
  }
};
