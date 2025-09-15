"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonFields = exports.CommonModel = void 0;
const sequelize_1 = require("sequelize");
class CommonModel extends sequelize_1.Model {
}
exports.CommonModel = CommonModel;
exports.commonFields = {
    uuid: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.UUIDV4,
        primaryKey: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
};
