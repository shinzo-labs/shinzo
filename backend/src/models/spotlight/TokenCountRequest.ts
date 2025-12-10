import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class TokenCountRequest extends CommonModel {
  public user_uuid!: string
  public api_key_uuid!: string | null
  public shinzo_api_key_uuid!: string
  public request_timestamp!: Date
  public model!: string
  public provider!: string
  public has_system_prompt!: boolean
  public has_tools!: boolean
  public message_count!: number
  public response_timestamp!: Date | null
  public latency_ms!: number | null
  public input_tokens!: number | null
  public request_data!: object
  public response_data!: object | null
  public error_message!: string | null
  public error_type!: string | null
  public auth_type!: string | null
  public status!: string

  static initialize(sequelize: Sequelize) {
    TokenCountRequest.init(
      {
        ...commonFields,
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        api_key_uuid: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        shinzo_api_key_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        request_timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        model: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        provider: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        has_system_prompt: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        has_tools: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        message_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        response_timestamp: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        latency_ms: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        request_data: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        response_data: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        error_type: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        auth_type: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: 'pending',
        },
      },
      {
        sequelize,
        modelName: 'TokenCountRequest',
        tableName: 'token_count_request',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
