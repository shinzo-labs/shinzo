import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class SpanLink extends CommonModel {
  public span_uuid!: string
  public trace_id!: string
  public span_id!: string
  public trace_state!: string | null
  public dropped_attributes_count!: number

  static initialize(sequelize: Sequelize) {
    SpanLink.init(
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
        trace_id: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        span_id: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        trace_state: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        dropped_attributes_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'SpanLink',
        tableName: 'span_link',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}
