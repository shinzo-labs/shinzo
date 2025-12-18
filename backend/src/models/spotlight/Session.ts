import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Session extends CommonModel {
  public user_uuid!: string
  public api_key_uuid!: string
  public shinzo_api_key_uuid!: string
  public session_id!: string
  public start_time!: Date
  public end_time!: Date | null
  public total_requests!: number
  public total_input_tokens!: number
  public total_output_tokens!: number
  public total_cache_creation_ephemeral_5m_input_tokens!: number
  public total_cache_creation_ephemeral_1h_input_tokens!: number

  static initialize(sequelize: Sequelize) {
    Session.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        api_key_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        shinzo_api_key_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        session_id: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        start_time: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        end_time: {
          type: DataTypes.DATE,
          allowNull: true,
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
        total_cache_creation_ephemeral_5m_input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        total_cache_creation_ephemeral_1h_input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'Session',
        tableName: 'session',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
