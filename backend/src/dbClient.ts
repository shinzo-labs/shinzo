import { Sequelize } from "sequelize"
import { DATABASE_URL, TZ } from "./config"
import { logger } from "./logger"
import {
  User,
  SubscriptionTier,
  UserPreferences,
  UserSurvey,
  Resource,
  ResourceAttribute,
  IngestToken,
  Trace,
  Span,
  SpanAttribute,
  SpanEvent,
  SpanEventAttribute,
  SpanLink,
  SpanLinkAttribute,
  Metric,
  MetricAttribute,
  HistogramBucket,
  ApiKey,
  Session,
  Interaction,
  TokenCountRequest,
  Tool,
  ToolUsage,
  UserAnalytics
} from './models'

logger.info('STARTUP: dbClient - About to create Sequelize instance')
export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true,
    // Add connection timeout to prevent hanging connections
    connectTimeout: 10_000, // 10 second connection timeout
    statement_timeout: 30_000, // 30 second query timeout
  },
  timezone: TZ || 'UTC',
  logging: logger.debug.bind(logger),
  benchmark: true,
  logQueryParameters: true,
  pool: {
    max: 25, // max number of connections (reduced from 150 to allow multiple pods)
    min: 2, // keep minimum connections warm to reduce cold start latency
    idle: 10_000, // max time (ms) that a connection can be idle before being released
    acquire: 10_000, // reduced from 30s - fail fast if pool is exhausted (matches K8s probe behavior)
    evict: 1_000, // time interval (ms) after which sequelize-pool will remove idle connections
    validate: (client: any) => {
      // Validate connection before use to prevent using stale connections
      return client && !client._ending
    }
  },
  retry: {
    max: 3, // retry failed queries up to 3 times
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
    ],
  }
})

// Helper function to get pool statistics for debugging
export const getPoolStats = () => {
  try {
    const pool = (sequelize as any).connectionManager?.pool
    if (pool) {
      return {
        size: pool.size ?? 'unknown',
        available: pool.available ?? 'unknown',
        pending: pool.pending ?? 'unknown',
        max: 25
      }
    }
  } catch (e) {
    // Pool stats not available
  }
  return { size: 'unknown', available: 'unknown', pending: 'unknown', max: 25 }
}

logger.info('STARTUP: dbClient - Sequelize instance created')

// Initialize models
logger.info('STARTUP: dbClient - About to initialize models')
User.initialize(sequelize)
SubscriptionTier.initialize(sequelize)
UserPreferences.initialize(sequelize)
UserSurvey.initialize(sequelize)
Resource.initialize(sequelize)
ResourceAttribute.initialize(sequelize)
IngestToken.initialize(sequelize)
Trace.initialize(sequelize)
Span.initialize(sequelize)
SpanAttribute.initialize(sequelize)
SpanEvent.initialize(sequelize)
SpanEventAttribute.initialize(sequelize)
SpanLink.initialize(sequelize)
SpanLinkAttribute.initialize(sequelize)
Metric.initialize(sequelize)
MetricAttribute.initialize(sequelize)
HistogramBucket.initialize(sequelize)
ApiKey.initialize(sequelize)
Session.initialize(sequelize)
Interaction.initialize(sequelize)
TokenCountRequest.initialize(sequelize)
Tool.initialize(sequelize)
ToolUsage.initialize(sequelize)
UserAnalytics.initialize(sequelize)
logger.info('STARTUP: dbClient - All models initialized')

// Set up associations
logger.info('STARTUP: dbClient - About to set up associations')
User.hasMany(Resource, { foreignKey: 'user_uuid', as: 'resources' })
User.hasMany(IngestToken, { foreignKey: 'user_uuid', as: 'ingestTokens' })
User.belongsTo(SubscriptionTier, { foreignKey: 'subscription_tier_uuid', as: 'subscriptionTier' })
User.hasMany(UserPreferences, { foreignKey: 'user_uuid', as: 'preferences' })

SubscriptionTier.hasMany(User, { foreignKey: 'subscription_tier_uuid', as: 'users' })

UserPreferences.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })

Resource.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })
Resource.hasMany(ResourceAttribute, { foreignKey: 'resource_uuid', as: 'attributes' })
Resource.hasMany(Trace, { foreignKey: 'resource_uuid', as: 'traces' })
Resource.hasMany(Metric, { foreignKey: 'resource_uuid', as: 'metrics' })

ResourceAttribute.belongsTo(Resource, { foreignKey: 'resource_uuid', as: 'resource' })

IngestToken.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })
IngestToken.hasMany(Trace, { foreignKey: 'ingest_token_uuid', as: 'traces' })
IngestToken.hasMany(Metric, { foreignKey: 'ingest_token_uuid', as: 'metrics' })

Trace.belongsTo(Resource, { foreignKey: 'resource_uuid', as: 'resource' })
Trace.belongsTo(IngestToken, { foreignKey: 'ingest_token_uuid', as: 'ingestToken' })
Trace.hasMany(Span, { foreignKey: 'trace_uuid', as: 'spans' })

Span.belongsTo(Trace, { foreignKey: 'trace_uuid', as: 'trace' })
Span.belongsTo(Span, { foreignKey: 'parent_span_uuid', as: 'parentSpan' })
Span.hasMany(Span, { foreignKey: 'parent_span_uuid', as: 'childSpans' })
Span.hasMany(SpanAttribute, { foreignKey: 'span_uuid', as: 'attributes' })
Span.hasMany(SpanEvent, { foreignKey: 'span_uuid', as: 'events' })
Span.hasMany(SpanLink, { foreignKey: 'span_uuid', as: 'links' })

SpanAttribute.belongsTo(Span, { foreignKey: 'span_uuid', as: 'span' })

SpanEvent.belongsTo(Span, { foreignKey: 'span_uuid', as: 'span' })
SpanEvent.hasMany(SpanEventAttribute, { foreignKey: 'span_event_uuid', as: 'attributes' })

SpanEventAttribute.belongsTo(SpanEvent, { foreignKey: 'span_event_uuid', as: 'event' })

SpanLink.belongsTo(Span, { foreignKey: 'span_uuid', as: 'span' })
SpanLink.hasMany(SpanLinkAttribute, { foreignKey: 'span_link_uuid', as: 'attributes' })

SpanLinkAttribute.belongsTo(SpanLink, { foreignKey: 'span_link_uuid', as: 'link' })

Metric.belongsTo(Resource, { foreignKey: 'resource_uuid', as: 'resource' })
Metric.belongsTo(IngestToken, { foreignKey: 'ingest_token_uuid', as: 'ingestToken' })
Metric.hasMany(MetricAttribute, { foreignKey: 'metric_uuid', as: 'attributes' })
Metric.hasMany(HistogramBucket, { foreignKey: 'metric_uuid', as: 'histogram_buckets' })

MetricAttribute.belongsTo(Metric, { foreignKey: 'metric_uuid', as: 'metric' })

HistogramBucket.belongsTo(Metric, { foreignKey: 'metric_uuid', as: 'metric' })

// Spotlight associations
User.hasMany(ApiKey, { foreignKey: 'user_uuid', as: 'apiKeys' })
User.hasMany(Session, { foreignKey: 'user_uuid', as: 'sessions' })
User.hasMany(Interaction, { foreignKey: 'user_uuid', as: 'interactions' })
User.hasMany(Tool, { foreignKey: 'user_uuid', as: 'tools' })
User.hasMany(UserAnalytics, { foreignKey: 'user_uuid', as: 'userAnalytics' })

ApiKey.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })
ApiKey.hasMany(Session, { foreignKey: 'api_key_uuid', as: 'sessions' })
ApiKey.hasMany(Interaction, { foreignKey: 'api_key_uuid', as: 'interactions' })

Session.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })
Session.belongsTo(ApiKey, { foreignKey: 'api_key_uuid', as: 'apiKey' })
Session.hasMany(Interaction, { foreignKey: 'session_uuid', as: 'interactions' })

Interaction.belongsTo(Session, { foreignKey: 'session_uuid', as: 'session' })
Interaction.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })
Interaction.belongsTo(ApiKey, { foreignKey: 'api_key_uuid', as: 'apiKey' })
Interaction.hasMany(ToolUsage, { foreignKey: 'interaction_uuid', as: 'toolUsages' })

Tool.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })
Tool.hasMany(ToolUsage, { foreignKey: 'tool_uuid', as: 'usages' })

ToolUsage.belongsTo(Interaction, { foreignKey: 'interaction_uuid', as: 'interaction' })
ToolUsage.belongsTo(Tool, { foreignKey: 'tool_uuid', as: 'tool' })

UserAnalytics.belongsTo(User, { foreignKey: 'user_uuid', as: 'user' })

logger.info('STARTUP: dbClient - All associations set up, dbClient module loaded successfully')
export const dbClient = sequelize
