import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export enum SubscriptionTierType {
  FREE = 'free',
  GROWTH = 'growth',
  SCALE = 'scale'
}

export class SubscriptionTier extends CommonModel {
  public tier!: SubscriptionTierType
  public monthly_quota!: number | null

  static initialize(sequelize: Sequelize) {
    SubscriptionTier.init(
      {
        ...commonFields,
        tier: {
          type: DataTypes.ENUM(...Object.values(SubscriptionTierType)),
          allowNull: false,
          unique: true,
        },
        monthly_quota: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'SubscriptionTier',
        tableName: 'subscription_tier',
        schema: 'main',
        timestamps: false,
      }
    )
  }
}