import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class UserPreferences extends CommonModel {
  public user_uuid!: string
  public preference_key!: string
  public preference_value!: any

  static initialize(sequelize: Sequelize) {
    UserPreferences.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'user',
            key: 'uuid',
          },
        },
        preference_key: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        preference_value: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'UserPreferences',
        tableName: 'user_preferences',
        schema: 'main',
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ['user_uuid', 'preference_key'],
          },
        ],
      }
    )
  }
}