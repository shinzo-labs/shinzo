import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../../dbClient'

interface SessionEventAttributes {
  uuid: string
  session_uuid: string
  timestamp: Date
  event_type: 'tool_call' | 'tool_response' | 'error' | 'user_input' | 'system_message'
  tool_name: string | null
  input_data: Record<string, any> | null
  output_data: Record<string, any> | null
  error_data: Record<string, any> | null
  duration_ms: number | null
  metadata: Record<string, any> | null
  created_at: Date
  updated_at: Date
}

interface SessionEventCreationAttributes extends Optional<SessionEventAttributes, 'uuid' | 'tool_name' | 'input_data' | 'output_data' | 'error_data' | 'duration_ms' | 'metadata' | 'created_at' | 'updated_at'> {}

export class SessionEvent extends Model<SessionEventAttributes, SessionEventCreationAttributes> implements SessionEventAttributes {
  declare uuid: string
  declare session_uuid: string
  declare timestamp: Date
  declare event_type: 'tool_call' | 'tool_response' | 'error' | 'user_input' | 'system_message'
  declare tool_name: string | null
  declare input_data: Record<string, any> | null
  declare output_data: Record<string, any> | null
  declare error_data: Record<string, any> | null
  declare duration_ms: number | null
  declare metadata: Record<string, any> | null
  declare readonly created_at: Date
  declare readonly updated_at: Date
}

SessionEvent.init(
  {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    session_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'session',
        key: 'uuid',
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    event_type: {
      type: DataTypes.ENUM('tool_call', 'tool_response', 'error', 'user_input', 'system_message'),
      allowNull: false,
    },
    tool_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    input_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    output_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    error_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'session_event',
    schema: 'open_telemetry',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['session_uuid'],
      },
      {
        fields: ['timestamp'],
      },
      {
        fields: ['event_type'],
      },
      {
        fields: ['tool_name'],
      },
    ],
  }
)
