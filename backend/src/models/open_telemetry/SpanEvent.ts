import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class SpanEvent extends CommonModel {
  public span_uuid!: string
  public name!: string
  public timestamp!: Date
  public dropped_attributes_count!: number

  static initialize(sequelize: Sequelize) {
    SpanEvent.init(
      {
        ...commonFields,
        span_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'span',
            key: 'uuid',
          },
        },
        name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        dropped_attributes_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'SpanEvent',
        tableName: 'span_event',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}
