"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class Resource extends Common_1.CommonModel {
    static initialize(sequelize) {
        Resource.init({
            ...Common_1.commonFields,
            user_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'uuid',
                },
            },
            service_name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            service_version: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            service_namespace: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            first_seen: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            last_seen: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: 'Resource',
            tableName: 'resource',
            schema: 'open_telemetry',
            timestamps: false,
        });
    }
}
exports.Resource = Resource;
