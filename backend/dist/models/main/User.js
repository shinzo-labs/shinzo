"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class User extends Common_1.CommonModel {
    static initialize(sequelize) {
        User.init({
            ...Common_1.commonFields,
            email: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                unique: true,
            },
            password_hash: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                unique: true,
            },
            password_salt: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                unique: true,
            },
            email_token: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                unique: true,
            },
            email_token_expiry: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            verified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: 'User',
            tableName: 'user',
            schema: 'main',
            timestamps: false,
        });
    }
}
exports.User = User;
