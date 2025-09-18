import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class User extends CommonModel {
  public email!: string
  public password_hash!: string
  public password_salt!: string
  public email_token!: string
  public email_token_expiry!: Date
  public verified!: boolean
  public auto_refresh_enabled!: boolean
  public auto_refresh_interval_seconds!: number | null

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
        auto_refresh_enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        auto_refresh_interval_seconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null,
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