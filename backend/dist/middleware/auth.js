"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateIngestToken = exports.authenticateJWT = void 0;
const auth_1 = require("../handlers/auth");
const ingest_1 = require("../handlers/ingest");
const logger_1 = require("../logger");
const authenticateJWT = async (request, reply) => {
    try {
        const authorization = request.headers.authorization;
        if (!authorization) {
            reply.status(401).send({ error: 'Missing authorization header' });
            return false;
        }
        const token = authorization.replace('Bearer ', '');
        const decoded = (0, auth_1.verifyJWT)(token);
        if (!decoded) {
            reply.status(401).send({ error: 'Invalid or expired token' });
            return false;
        }
        request.user = decoded;
        return true;
    }
    catch (error) {
        logger_1.logger.error({ message: 'Authentication error', error });
        reply.status(401).send({ error: 'Authentication failed' });
        return false;
    }
};
exports.authenticateJWT = authenticateJWT;
const authenticateIngestToken = async (request) => {
    try {
        const ingestTokenHeader = request.headers['ingest-token'];
        if (!ingestTokenHeader) {
            return null;
        }
        const ingestToken = await (0, ingest_1.verifyIngestToken)(ingestTokenHeader);
        if (!ingestToken) {
            return null;
        }
        return ingestToken.user_uuid;
    }
    catch (error) {
        logger_1.logger.error({ message: 'Ingest token authentication error', error });
        return null;
    }
};
exports.authenticateIngestToken = authenticateIngestToken;
