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