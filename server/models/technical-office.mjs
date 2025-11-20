import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "TechnicalOffice",
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
    },
    {
      tableName: "technical_offices",
      timestamps: true,
    }
  );
};
