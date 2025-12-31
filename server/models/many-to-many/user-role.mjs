import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "UserRole",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "roles",
          key: "id",
        },
      },
    },
    {
      tableName: "user_role",
      timestamps: false,
    }
  );
};
