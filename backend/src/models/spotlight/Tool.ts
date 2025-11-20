import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Tool extends CommonModel {
  public user_uuid!: string
  public tool_name!: string
  public description!: string | null
  public input_schema!: object | null
  public first_seen!: Date
  public last_seen!: Date
  public total_calls!: number
  public total_input_tokens!: number
  public total_output_tokens!: number

  static initialize(sequelize: Sequelize) {
    Tool.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        tool_name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        input_schema: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        first_seen: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        last_seen: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        total_calls: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        total_input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        total_output_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'Tool',
        tableName: 'tool',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
