import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "REPORT_STATUS_CHANGE",
          "NEW_MESSAGE",
          "ASSIGNMENT",
          "SYSTEM"
        ),
        allowNull: false,
        defaultValue: "SYSTEM",
      },

      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      reportId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "reports",
          key: "id",
        },
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
    }
  );
};
