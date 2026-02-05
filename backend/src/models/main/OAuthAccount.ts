import { DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class OAuthAccount extends CommonModel {
  public user_uuid!: string
  public oauth_provider!: 'google' | 'github'
  public oauth_id!: string
  public oauth_email!: string | null
  public oauth_profile_data!: Record<string, any> | null
  public linked_at!: Date

  static initialize(sequelize: Sequelize) {
    OAuthAccount.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        oauth_provider: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        oauth_id: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        oauth_email: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        oauth_profile_data: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        linked_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'OAuthAccount',
        tableName: 'oauth_account',
        schema: 'main',
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ['oauth_provider', 'oauth_id'],
          },
        ],
      }
    )
  }
}
