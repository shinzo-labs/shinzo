"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metric = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class Metric extends Common_1.CommonModel {
    static initialize(sequelize) {
        Metric.init({
            ...Common_1.commonFields,
            resource_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'resource',
                    key: 'uuid',
                },
            },
            ingest_token_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'ingest_token',
                    key: 'uuid',
                },
            },
            name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            unit: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            metric_type: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    isIn: [['counter', 'gauge', 'histogram']],
                },
            },
            timestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            value: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            scope_name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            scope_version: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'Metric',
            tableName: 'metric',
            schema: 'open_telemetry',
            timestamps: false,
        });
    }
}
exports.Metric = Metric;
