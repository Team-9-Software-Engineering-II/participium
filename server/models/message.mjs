import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "messages",
      timestamps: true,
    }
  );
};
