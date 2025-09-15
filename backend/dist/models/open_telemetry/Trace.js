"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trace = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class Trace extends Common_1.CommonModel {
    static initialize(sequelize) {
        Trace.init({
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
            start_time: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            end_time: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            service_name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            operation_name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    isIn: [['ok', 'error', 'timeout']],
                },
            },
            span_count: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
        }, {
            sequelize,
            modelName: 'Trace',
            tableName: 'trace',
            schema: 'open_telemetry',
            timestamps: false,
        });
    }
}
exports.Trace = Trace;
