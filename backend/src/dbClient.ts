import { Sequelize } from "sequelize"
import { DATABASE_URL, TZ } from "./config"
import { logger } from "./logger"
import {
  User,
  SubscriptionTier,
  UserPreferences,
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
  HistogramBucket
} from './models'

export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true
  },
  timezone: TZ || 'UTC',
  logging: logger.debug.bind(logger),
  benchmark: true,
  logQueryParameters: true,
  pool: {
    max: 150, // max number of connections
    idle: 5_000,// max time (ms) that a connection can be idle before being released
    acquire: 30_000,// max time (ms) that pool will try to get connection before throwing error
    evict: 1_000// time interval (ms) after which sequelize-pool will remove idle connections
  }
})

// Initialize models
User.initialize(sequelize)
SubscriptionTier.initialize(sequelize)
UserPreferences.initialize(sequelize)
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

// Set up associations
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

export const dbClient = sequelize
