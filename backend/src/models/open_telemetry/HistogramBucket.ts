import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class HistogramBucket extends CommonModel {
  public metric_uuid!: string
  public bucket_index!: number
  public explicit_bound!: number | null
  public bucket_count!: number

  static initialize(sequelize: Sequelize) {
    HistogramBucket.init(
      {
        ...commonFields,
        metric_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'metric',
            key: 'uuid',
          },
        },
        bucket_index: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        explicit_bound: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        bucket_count: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'HistogramBucket',
        tableName: 'histogram_bucket',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}
