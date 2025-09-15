import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Trace extends CommonModel {
  public resource_uuid!: string
  public ingest_token_uuid!: string
  public start_time!: Date
  public end_time!: Date | null
  public service_name!: string
  public operation_name!: string | null
  public status!: 'ok' | 'error' | 'timeout' | null
  public span_count!: number

  static initialize(sequelize: Sequelize) {
    Trace.init(
      {
        ...commonFields,
        resource_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'resource',
            key: 'uuid',
          },
        },
        ingest_token_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'ingest_token',
            key: 'uuid',
          },
        },
        start_time: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        end_time: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        service_name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        operation_name: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            isIn: [['ok', 'error', 'timeout']],
          },
        },
        span_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'Trace',
        tableName: 'trace',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}