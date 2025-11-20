import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class ToolUsage extends CommonModel {
  public interaction_uuid!: string
  public tool_uuid!: string
  public tool_name!: string
  public tool_input!: object | null
  public tool_output!: object | null
  public execution_time_ms!: number | null
  public input_tokens!: number
  public output_tokens!: number

  static initialize(sequelize: Sequelize) {
    ToolUsage.init(
      {
        ...commonFields,
        interaction_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        tool_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        tool_name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        tool_input: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        tool_output: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        execution_time_ms: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        output_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'ToolUsage',
        tableName: 'tool_usage',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
