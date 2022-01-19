const Sequelize = require("sequelize");

module.exports = class BlcokChainDB extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        BCNUM: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true,
        },

        BlockChain: {
          type: Sequelize.JSON,
          allowNull: true,
        },
      },
      {
        sequelize,
        timestamps: false,
        underscored: false,
        modelName: "BC3",
        tableName: "BC3",
        paranoid: false,
        charset: "utf8",
        collate: "utf8_general_ci",
      }
    );
  }

  static associate(db) {}
};
