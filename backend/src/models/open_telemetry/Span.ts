import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Span extends CommonModel {
  public trace_uuid!: string
  public parent_span_uuid!: string | null
  public operation_name!: string
  public start_time!: Date
  public end_time!: Date | null
  public duration_ms!: number | null
  public status_code!: number | null
  public status_message!: string | null
  public span_kind!: string | null
  public service_name!: string | null
  public trace_id!: string | null
  public span_id!: string | null
  public parent_span_id!: string | null
  public scope_name!: string | null
  public scope_version!: string | null
  public dropped_attributes_count!: number
  public dropped_events_count!: number
  public dropped_links_count!: number

  static initialize(sequelize: Sequelize) {
    Span.init(
      {
        ...commonFields,
        trace_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'trace',
            key: 'uuid',
          },
        },
        parent_span_uuid: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'span',
            key: 'uuid',
          },
        },
        operation_name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        start_time: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        end_time: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        duration_ms: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        status_code: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        status_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        span_kind: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        service_name: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        trace_id: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        span_id: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        parent_span_id: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        scope_name: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        scope_version: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        dropped_attributes_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        dropped_events_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        dropped_links_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'Span',
        tableName: 'span',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}