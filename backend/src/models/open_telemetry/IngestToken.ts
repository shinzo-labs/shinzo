import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class IngestToken extends CommonModel {
  public user_uuid!: string
  public ingest_token!: string
  public status!: 'live' | 'deprecated'

  static initialize(sequelize: Sequelize) {
    IngestToken.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        ingest_token: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        status: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            isIn: [['live', 'deprecated']],
          },
        },
      },
      {
        sequelize,
        modelName: 'IngestToken',
        tableName: 'ingest_token',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}