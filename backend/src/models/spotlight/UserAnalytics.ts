import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class UserAnalytics extends CommonModel {
  public user_uuid!: string
  public end_user_id!: string
  public total_requests!: number
  public total_input_tokens!: number
  public total_output_tokens!: number
  public total_cached_tokens!: number
  public first_request!: Date | null
  public last_request!: Date | null

  static initialize(sequelize: Sequelize) {
    UserAnalytics.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        end_user_id: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        total_requests: {
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
        total_cached_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        first_request: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_request: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'UserAnalytics',
        tableName: 'user_analytics',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
