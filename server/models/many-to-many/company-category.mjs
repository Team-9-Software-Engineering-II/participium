import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "CompanyCategory",
    {
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "companies",
          key: "id",
        },
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "problems_categories",
          key: "id",
        },
      },
    },
    {
      tableName: "company_category",
      timestamps: false,
    }
  );
};
