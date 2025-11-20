import { Sequelize } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/database.sqlite",
  logging: true,
});
