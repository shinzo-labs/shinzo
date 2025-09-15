"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestToken = void 0;
const sequelize_1 = require("sequelize");
const Common_1 = require("../Common");
class IngestToken extends Common_1.CommonModel {
    static initialize(sequelize) {
        IngestToken.init({
            ...Common_1.commonFields,
            user_uuid: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'uuid',
                },
            },
            ingest_token: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                unique: true,
            },
            status: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    isIn: [['live', 'deprecated']],
                },
            },
        }, {
            sequelize,
            modelName: 'IngestToken',
            tableName: 'ingest_token',
            schema: 'open_telemetry',
            timestamps: false,
        });
    }
}
exports.IngestToken = IngestToken;
