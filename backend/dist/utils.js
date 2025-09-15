"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReply = void 0;
const logger_1 = require("./logger");
const sendReply = ({ body, status, error, reply }) => {
    const statusCode = status ?? (error ? 400 : 200);
    const replyMessage = error
        ? { status: statusCode, error: body }
        : { status: statusCode, body };
    if (error) {
        logger_1.logger.error({ statusCode, response: body });
    }
    else {
        logger_1.logger.info({ statusCode, response: body });
    }
    reply.status(statusCode).send(replyMessage);
};
exports.sendReply = sendReply;
