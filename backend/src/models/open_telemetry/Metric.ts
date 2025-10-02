import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Metric extends CommonModel {
  public resource_uuid!: string
  public ingest_token_uuid!: string
  public name!: string
  public description!: string | null
  public unit!: string | null
  public metric_type!: 'counter' | 'gauge' | 'histogram'
  public timestamp!: Date
  public value!: number | null
  public scope_name!: string | null
  public scope_version!: string | null
  public start_timestamp!: Date | null
  public aggregation_temporality!: number | null
  public is_monotonic!: boolean | null
  public min_value!: number | null
  public max_value!: number | null
  public count!: number | null
  public sum_value!: number | null

  static initialize(sequelize: Sequelize) {
    Metric.init(
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
        name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        unit: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metric_type: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            isIn: [['counter', 'gauge', 'histogram']],
          },
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        value: {
          type: DataTypes.DOUBLE,
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
        start_timestamp: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        aggregation_temporality: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        is_monotonic: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        min_value: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        max_value: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        count: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        sum_value: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Metric',
        tableName: 'metric',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}