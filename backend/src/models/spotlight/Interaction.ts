import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class Interaction extends CommonModel {
  public session_uuid!: string
  public user_uuid!: string
  public api_key_uuid!: string
  public request_timestamp!: Date
  public model!: string
  public provider!: string
  public max_tokens!: number | null
  public temperature!: number | null
  public system_prompt!: string | null
  public response_timestamp!: Date | null
  public response_id!: string | null
  public stop_reason!: string | null
  public latency_ms!: number | null
  public input_tokens!: number | null
  public output_tokens!: number | null
  public cache_creation_input_tokens!: number
  public cache_read_input_tokens!: number
  public request_data!: object
  public response_data!: object | null
  public error_message!: string | null
  public error_type!: string | null
  public status!: string

  static initialize(sequelize: Sequelize) {
    Interaction.init(
      {
        ...commonFields,
        session_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        user_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        api_key_uuid: {
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
        max_tokens: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        temperature: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        system_prompt: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        response_timestamp: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        response_id: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        stop_reason: {
          type: DataTypes.TEXT,
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
        output_tokens: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        cache_creation_input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        cache_read_input_tokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
        status: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: 'pending',
        },
      },
      {
        sequelize,
        modelName: 'Interaction',
        tableName: 'interaction',
        schema: 'spotlight',
        timestamps: false,
      }
    )
  }
}
