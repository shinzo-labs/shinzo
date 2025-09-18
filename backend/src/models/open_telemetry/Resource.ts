import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Resource extends CommonModel {
  public user_uuid!: string
  public service_name!: string
  public service_version!: string | null
  public service_namespace!: string | null
  public first_seen!: Date | null
  public last_seen!: Date | null

  static initialize(sequelize: Sequelize) {
    Resource.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        service_name: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        service_version: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        service_namespace: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        first_seen: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: DataTypes.NOW,
        },
        last_seen: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Resource',
        tableName: 'resource',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}