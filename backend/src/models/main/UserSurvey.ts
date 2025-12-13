import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class UserSurvey extends CommonModel {
  public user_uuid!: string
  public usage_types!: string[]
  public role?: string
  public referral_sources?: string[]

  static initialize(sequelize: Sequelize) {
    UserSurvey.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: 'user',
            key: 'uuid',
          },
        },
        usage_types: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
        },
        role: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        referral_sources: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'UserSurvey',
        tableName: 'user_survey',
        schema: 'main',
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ['user_uuid'],
          },
        ],
      }
    )
  }
}
