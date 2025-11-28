import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "Report",
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
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "Pending Approval",
          "Assigned",
          "In Progress",
          "Suspended",
          "Rejected",
          "Resolved"
        ),
        allowNull: false,
        defaultValue: "Pending Approval",
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      anonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      photosLinks: {
        type: DataTypes.TEXT, // Salvare come JSON.stringify(['link1', 'link2'])
        allowNull: true,
        get() {
          const val = this.getDataValue("photosLinks");
          return val ? JSON.parse(val) : [];
        },
        set(val) {
          this.setDataValue("photosLinks", JSON.stringify(val));
        },
      },
    },
    {
      tableName: "reports",
      timestamps: true,
    }
  );
};
