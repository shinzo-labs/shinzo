"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbClient = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("./config");
const logger_1 = require("./logger");
const models_1 = require("./models");
exports.sequelize = new sequelize_1.Sequelize(config_1.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        supportBigNumbers: true,
        bigNumberStrings: true
    },
    timezone: config_1.TZ,
    logging: logger_1.logger.debug.bind(logger_1.logger),
    benchmark: true,
    logQueryParameters: true,
    pool: {
        max: 150, // max number of connections
        idle: 5_000, // max time (ms) that a connection can be idle before being released
        acquire: 30_000, // max time (ms) that pool will try to get connection before throwing error
        evict: 1_000 // time interval (ms) after which sequelize-pool will remove idle connections
    }
});
// Initialize models
models_1.User.initialize(exports.sequelize);
models_1.Resource.initialize(exports.sequelize);
models_1.ResourceAttribute.initialize(exports.sequelize);
models_1.IngestToken.initialize(exports.sequelize);
models_1.Trace.initialize(exports.sequelize);
models_1.Span.initialize(exports.sequelize);
models_1.SpanAttribute.initialize(exports.sequelize);
models_1.Metric.initialize(exports.sequelize);
models_1.MetricAttribute.initialize(exports.sequelize);
// Set up associations
models_1.User.hasMany(models_1.Resource, { foreignKey: 'user_uuid', as: 'resources' });
models_1.User.hasMany(models_1.IngestToken, { foreignKey: 'user_uuid', as: 'ingestTokens' });
models_1.Resource.belongsTo(models_1.User, { foreignKey: 'user_uuid', as: 'user' });
models_1.Resource.hasMany(models_1.ResourceAttribute, { foreignKey: 'resource_uuid', as: 'attributes' });
models_1.Resource.hasMany(models_1.Trace, { foreignKey: 'resource_uuid', as: 'traces' });
models_1.Resource.hasMany(models_1.Metric, { foreignKey: 'resource_uuid', as: 'metrics' });
models_1.ResourceAttribute.belongsTo(models_1.Resource, { foreignKey: 'resource_uuid', as: 'resource' });
models_1.IngestToken.belongsTo(models_1.User, { foreignKey: 'user_uuid', as: 'user' });
models_1.IngestToken.hasMany(models_1.Trace, { foreignKey: 'ingest_token_uuid', as: 'traces' });
models_1.IngestToken.hasMany(models_1.Metric, { foreignKey: 'ingest_token_uuid', as: 'metrics' });
models_1.Trace.belongsTo(models_1.Resource, { foreignKey: 'resource_uuid', as: 'resource' });
models_1.Trace.belongsTo(models_1.IngestToken, { foreignKey: 'ingest_token_uuid', as: 'ingestToken' });
models_1.Trace.hasMany(models_1.Span, { foreignKey: 'trace_uuid', as: 'spans' });
models_1.Span.belongsTo(models_1.Trace, { foreignKey: 'trace_uuid', as: 'trace' });
models_1.Span.belongsTo(models_1.Span, { foreignKey: 'parent_span_uuid', as: 'parentSpan' });
models_1.Span.hasMany(models_1.Span, { foreignKey: 'parent_span_uuid', as: 'childSpans' });
models_1.Span.hasMany(models_1.SpanAttribute, { foreignKey: 'span_uuid', as: 'attributes' });
models_1.SpanAttribute.belongsTo(models_1.Span, { foreignKey: 'span_uuid', as: 'span' });
models_1.Metric.belongsTo(models_1.Resource, { foreignKey: 'resource_uuid', as: 'resource' });
models_1.Metric.belongsTo(models_1.IngestToken, { foreignKey: 'ingest_token_uuid', as: 'ingestToken' });
models_1.Metric.hasMany(models_1.MetricAttribute, { foreignKey: 'metric_uuid', as: 'attributes' });
models_1.MetricAttribute.belongsTo(models_1.Metric, { foreignKey: 'metric_uuid', as: 'metric' });
exports.dbClient = exports.sequelize;
