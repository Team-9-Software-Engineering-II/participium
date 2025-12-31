import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "UserTechnicalOffice",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      tech_office_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "technical_offices",
          key: "id",
        },
      },
    },
    {
      tableName: "user_technical_office",
      timestamps: false,
    }
  );
};
