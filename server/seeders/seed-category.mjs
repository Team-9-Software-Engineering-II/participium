import db from "../models/index.mjs";
import logger from "../shared/logging/logger.mjs";

/**
 * Seeds the 'problems_categories' table with the default categories
 */
export const seedCategories = async () => {
  try {
    // Check if the table is already populated
    const count = await db.Category.count();
    if (count > 0) {
      return;
    }

    await db.Category.bulkCreate([
      {
        id: 1,
        name: "Water Supply - Drinking Water",
        description:
          "Reports related to public drinking fountains, water leaks, or supply issues.",
      },
      {
        id: 2,
        name: "Architectural Barriers",
        description:
          "Reports on physical barriers that hinder mobility, such as sidewalks without ramps, or non-functional elevators.",
      },
      {
        id: 3,
        name: "Sewer System",
        description:
          "Reports concerning blocked drains, manhole covers, or sewer odors.",
      },
      {
        id: 4,
        name: "Public Lighting",
        description:
          "Reports for non-functioning or damaged streetlights and public lighting.",
      },
      {
        id: 5,
        name: "Waste",
        description:
          "Reports of overflowing bins, abandoned waste, or requests for street cleaning.",
      },
      {
        id: 6,
        name: "Road Signs and Traffic Lights",
        description:
          "Reports on damaged/missing road signs or malfunctioning traffic lights.",
      },
      {
        id: 7,
        name: "Roads and Urban Furnishings",
        description:
          "Reports related to potholes, damaged sidewalks, benches, or other public furniture.",
      },
      {
        id: 8,
        name: "Public Green Areas and Playgrounds",
        description:
          "Reports on maintenance for parks, public gardens, fallen trees, or damaged playground equipment.",
      },
      {
        id: 9,
        name: "Other",
        description:
          "A general category for reports that do not fit into the other specific areas.",
      },
    ]);

    logger.info("Categories seeded successfully.");
  } catch (err) {
    logger.error("Error seeding categories:", err);
    throw err;
  }
};
