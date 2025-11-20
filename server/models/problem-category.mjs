import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "ProblemCategory",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "problems_categories",
      timestamps: true,
    }
  );
};
