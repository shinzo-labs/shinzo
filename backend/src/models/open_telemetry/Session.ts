import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../../dbClient'

interface SessionAttributes {
  uuid: string
  user_uuid: string
  resource_uuid: string
  session_id: string
  start_time: Date
  end_time: Date | null
  status: 'active' | 'completed' | 'error'
  error_message: string | null
  total_events: number
  metadata: Record<string, any> | null
  created_at: Date
  updated_at: Date
}

interface SessionCreationAttributes extends Optional<SessionAttributes, 'uuid' | 'end_time' | 'error_message' | 'total_events' | 'metadata' | 'created_at' | 'updated_at'> {}

export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  declare uuid: string
  declare user_uuid: string
  declare resource_uuid: string
  declare session_id: string
  declare start_time: Date
  declare end_time: Date | null
  declare status: 'active' | 'completed' | 'error'
  declare error_message: string | null
  declare total_events: number
  declare metadata: Record<string, any> | null
  declare readonly created_at: Date
  declare readonly updated_at: Date
}

Session.init(
  {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'uuid',
      },
    },
    resource_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'resources',
        key: 'uuid',
      },
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'error'),
      allowNull: false,
      defaultValue: 'active',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_events: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'session',
    schema: 'open_telemetry',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_uuid'],
      },
      {
        fields: ['resource_uuid'],
      },
      {
        fields: ['session_id'],
        unique: true,
      },
      {
        fields: ['start_time'],
      },
      {
        fields: ['status'],
      },
    ],
  }
)
