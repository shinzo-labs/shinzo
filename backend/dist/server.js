"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const config_1 = require("./config");
const logger_1 = require("./logger");
const dbClient_1 = require("./dbClient");
const auth_1 = require("./middleware/auth");
// Import handlers
const auth_2 = require("./handlers/auth");
const telemetry_1 = require("./handlers/telemetry");
const ingest_1 = require("./handlers/ingest");
const ingestToken_1 = require("./handlers/ingestToken");
// Create Fastify instance
const app = (0, fastify_1.default)({
    logger: (0, logger_1.pinoConfig)('backend'),
    bodyLimit: parseInt(config_1.MAX_PAYLOAD_SIZE.replace('mb', '')) * 1024 * 1024,
});
// Register plugins
app.register(cors_1.default, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});
app.register(rate_limit_1.default, {
    max: config_1.RATE_LIMIT_MAX,
    timeWindow: config_1.RATE_LIMIT_WINDOW
});
// Health check endpoint
app.get('/health', async (request, reply) => {
    try {
        await dbClient_1.sequelize.authenticate();
        reply.send({ status: 'ok', timestamp: new Date().toISOString() });
    }
    catch (error) {
        reply.status(503).send({ status: 'error', message: 'Database connection failed' });
    }
});
// Authentication endpoints
app.post('/auth/create_user', async (request, reply) => {
    try {
        const validatedBody = await auth_2.createUserSchema.validate(request.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const result = await (0, auth_2.handleCreateUser)(validatedBody);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Create user error', error });
        if (error.name === 'ValidationError') {
            reply.status(400).send({ error: error.message });
        }
        else {
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
});
app.post('/auth/login', async (request, reply) => {
    try {
        const validatedBody = await auth_2.loginSchema.validate(request.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const result = await (0, auth_2.handleLogin)(validatedBody);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Login error', error });
        if (error.name === 'ValidationError') {
            reply.status(400).send({ error: error.message });
        }
        else {
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
});
app.post('/auth/verify_user', async (request, reply) => {
    try {
        const validatedBody = await auth_2.verifyUserSchema.validate(request.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const result = await (0, auth_2.handleVerifyUser)(validatedBody);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Verify user error', error });
        if (error.name === 'ValidationError') {
            reply.status(400).send({ error: error.message });
        }
        else {
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
});
app.get('/auth/fetch_user', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const result = await (0, auth_2.handleFetchUser)(request.user.uuid);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Fetch user error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
// Ingest token management endpoints
app.post('/auth/generate_ingest_token', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        logger_1.logger.info({ message: 'Generate ingest token request', user: request.user });
        const result = await (0, ingestToken_1.handleGenerateIngestToken)(request.user.uuid);
        logger_1.logger.info({ message: 'Generate ingest token result', status: result.status, hasError: !!result.error });
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Generate ingest token error', error: error.message, stack: error.stack });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
app.get('/auth/fetch_ingest_tokens', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const result = await (0, ingestToken_1.handleFetchIngestTokens)(request.user.uuid);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Fetch ingest tokens error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
app.post('/auth/revoke_ingest_token/:tokenUuid', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const { tokenUuid } = request.params;
        const result = await (0, ingestToken_1.handleRevokeIngestToken)(request.user.uuid, tokenUuid);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Revoke ingest token error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
// Telemetry data retrieval endpoints
app.get('/telemetry/fetch_resources', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const result = await (0, telemetry_1.handleFetchResources)(request.user.uuid);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Fetch resources error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
app.get('/telemetry/fetch_traces', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const validatedQuery = await telemetry_1.fetchDataSchema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true,
        });
        const result = await (0, telemetry_1.handleFetchTraces)(request.user.uuid, validatedQuery);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Fetch traces error', error });
        if (error.name === 'ValidationError') {
            reply.status(400).send({ error: error.message });
        }
        else {
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
});
app.get('/telemetry/fetch_spans', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const validatedQuery = await telemetry_1.fetchDataSchema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true,
        });
        const result = await (0, telemetry_1.handleFetchSpans)(request.user.uuid, validatedQuery);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Fetch spans error', error });
        if (error.name === 'ValidationError') {
            reply.status(400).send({ error: error.message });
        }
        else {
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
});
app.get('/telemetry/fetch_metrics', async (request, reply) => {
    const authenticated = await (0, auth_1.authenticateJWT)(request, reply);
    if (!authenticated)
        return;
    try {
        const validatedQuery = await telemetry_1.fetchDataSchema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true,
        });
        const result = await (0, telemetry_1.handleFetchMetrics)(request.user.uuid, validatedQuery);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Fetch metrics error', error });
        if (error.name === 'ValidationError') {
            reply.status(400).send({ error: error.message });
        }
        else {
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
});
// Telemetry ingestion endpoints
app.post('/telemetry/ingest_http', async (request, reply) => {
    try {
        const ingestTokenHeader = request.headers['authorization'];
        if (!ingestTokenHeader) {
            reply.status(401).send({ error: 'Missing Authorization header' });
            return;
        }
        const ingestToken = await (0, ingest_1.verifyIngestToken)(ingestTokenHeader);
        if (!ingestToken) {
            reply.status(401).send({ error: 'Invalid or inactive Authorization token' });
            return;
        }
        const result = await (0, ingest_1.handleIngestHTTP)(ingestToken, request.body);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Ingest HTTP error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
// OpenTelemetry specification compliant endpoints
app.post('/telemetry/ingest_http/metrics', async (request, reply) => {
    try {
        const ingestTokenHeader = request.headers['authorization'];
        if (!ingestTokenHeader) {
            reply.status(401).send({ error: 'Missing Authorization header' });
            return;
        }
        const ingestToken = await (0, ingest_1.verifyIngestToken)(ingestTokenHeader);
        if (!ingestToken) {
            reply.status(401).send({ error: 'Invalid or inactive Authorization token' });
            return;
        }
        const result = await (0, ingest_1.handleIngestHTTP)(ingestToken, request.body);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Ingest HTTP metrics error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
app.post('/telemetry/ingest_http/traces', async (request, reply) => {
    try {
        const ingestTokenHeader = request.headers['authorization'];
        if (!ingestTokenHeader) {
            reply.status(401).send({ error: 'Missing Authorization header' });
            return;
        }
        const ingestToken = await (0, ingest_1.verifyIngestToken)(ingestTokenHeader);
        if (!ingestToken) {
            reply.status(401).send({ error: 'Invalid or inactive Authorization token' });
            return;
        }
        const result = await (0, ingest_1.handleIngestHTTP)(ingestToken, request.body);
        reply.status(result.status || 200).send(result.response);
    }
    catch (error) {
        logger_1.logger.error({ message: 'Ingest HTTP traces error', error });
        reply.status(500).send({ error: 'Internal server error' });
    }
});
// Error handler
app.setErrorHandler((error, request, reply) => {
    logger_1.logger.error({ message: 'Unhandled error', error, url: request.url });
    reply.status(500).send({ error: 'Internal server error' });
});
// Start server
const start = async () => {
    try {
        // Test database connection
        await dbClient_1.sequelize.authenticate();
        logger_1.logger.info('Database connection established successfully');
        // Start server
        logger_1.logger.info({ msg: `Starting service on port ${config_1.PORT}` });
        await app.listen({ port: parseInt(config_1.PORT), host: '0.0.0.0' });
    }
    catch (error) {
        logger_1.logger.error({ message: 'Failed to start server', error });
        process.exit(1);
    }
};
// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    await app.close();
    await dbClient_1.sequelize.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    await app.close();
    await dbClient_1.sequelize.close();
    process.exit(0);
});
start();
