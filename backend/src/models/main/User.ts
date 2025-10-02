import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class User extends CommonModel {
  public email!: string
  public password_hash!: string
  public password_salt!: string
  public email_token!: string
  public email_token_expiry!: Date
  public verified!: boolean
  public monthly_counter!: number
  public last_counter_reset!: Date
  public subscription_tier_uuid!: string
  public subscribed_on!: Date | null

  static initialize(sequelize: Sequelize) {
    User.init(
      {
        ...commonFields,
        email: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        password_hash: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        password_salt: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        email_token: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        email_token_expiry: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        monthly_counter: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        last_counter_reset: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        subscription_tier_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        subscribed_on: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'user',
        schema: 'main',
        timestamps: false,
      }
    )
  }
}