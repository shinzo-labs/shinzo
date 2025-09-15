"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceAttribute = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class ResourceAttribute extends Common_1.CommonModel {
    static initialize(sequelize) {
        ResourceAttribute.init({
            ...Common_1.commonFields,
            resource_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'resource',
                    key: 'uuid',
                },
            },
            key: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            value_type: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    isIn: [['string', 'int', 'double', 'bool', 'array']],
                },
            },
            string_value: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            int_value: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            double_value: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            bool_value: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
            },
            array_value: {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'ResourceAttribute',
            tableName: 'resource_attribute',
            schema: 'open_telemetry',
            timestamps: false,
        });
    }
}
exports.ResourceAttribute = ResourceAttribute;
