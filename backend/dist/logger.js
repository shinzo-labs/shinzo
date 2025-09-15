"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.pinoConfig = void 0;
const pino_1 = require("pino");
const config_1 = require("./config");
const EDGE_LIMIT = 200;
const pinoConfig = (name) => ({
    level: config_1.LOG_LEVEL,
    name,
    edgeLimit: EDGE_LIMIT,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            levelFirst: true
        }
    },
    levelFirst: true,
    serializers: {
        error: (err) => ({
            message: err.message,
            stack: err.stack
        })
    }
});
exports.pinoConfig = pinoConfig;
exports.logger = (0, pino_1.pino)((0, exports.pinoConfig)('shinzo'));
