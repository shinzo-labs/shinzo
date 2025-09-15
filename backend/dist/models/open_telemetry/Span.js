"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Span = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class Span extends Common_1.CommonModel {
    static initialize(sequelize) {
        Span.init({
            ...Common_1.commonFields,
            trace_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'trace',
                    key: 'uuid',
                },
            },
            parent_span_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'span',
                    key: 'uuid',
                },
            },
            operation_name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
            },
            start_time: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            end_time: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            duration_ms: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            status_code: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            status_message: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            span_kind: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            service_name: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: 'Span',
            tableName: 'span',
            schema: 'open_telemetry',
            timestamps: false,
        });
    }
}
exports.Span = Span;
