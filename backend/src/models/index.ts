import { User } from './main/User'
import { UserPreferences } from './main/UserPreferences'
import { Resource } from './open_telemetry/Resource'
import { ResourceAttribute } from './open_telemetry/ResourceAttribute'
import { IngestToken } from './open_telemetry/IngestToken'
import { Trace } from './open_telemetry/Trace'
import { Span } from './open_telemetry/Span'
import { SpanAttribute } from './open_telemetry/SpanAttribute'
import { Metric } from './open_telemetry/Metric'
import { MetricAttribute } from './open_telemetry/MetricAttribute'
import { Session } from './open_telemetry/Session'
import { SessionEvent } from './open_telemetry/SessionEvent'

// Set up associations
Session.hasMany(SessionEvent, {
  foreignKey: 'session_uuid',
  as: 'events'
})

SessionEvent.belongsTo(Session, {
  foreignKey: 'session_uuid',
  as: 'session'
})

Session.belongsTo(Resource, {
  foreignKey: 'resource_uuid',
  as: 'resource'
})

Resource.hasMany(Session, {
  foreignKey: 'resource_uuid',
  as: 'sessions'
})

export {
  User,
  UserPreferences,
  Resource,
  ResourceAttribute,
  IngestToken,
  Trace,
  Span,
  SpanAttribute,
  Metric,
  MetricAttribute,
  Session,
  SessionEvent,
}
