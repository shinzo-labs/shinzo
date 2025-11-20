import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class ApiKey extends CommonModel {
  public user_uuid!: string
  public key_name!: string
  public api_key!: string
  public provider!: string
  public provider_api_key!: string
  public provider_base_url!: string | null
  public status!: string
  public last_used!: Date | null

  static initialize(sequelize: Sequelize) {
    ApiKey.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        key_name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        api_key: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        provider: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        provider_api_key: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        provider_base_url: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: 'active',
        },
        last_used: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'ApiKey',
        tableName: 'api_key',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
