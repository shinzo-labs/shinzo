import { Model, DataTypes, Sequelize } from 'sequelize'
import { CommonModel, commonFields } from '../Common'

export class ResourceAttribute extends CommonModel {
  public resource_uuid!: string
  public key!: string
  public value_type!: 'string' | 'int' | 'double' | 'bool' | 'array'
  public string_value!: string | null
  public int_value!: number | null
  public double_value!: number | null
  public bool_value!: boolean | null
  public array_value!: any | null

  static initialize(sequelize: Sequelize) {
    ResourceAttribute.init(
      {
        ...commonFields,
        resource_uuid: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'resource',
            key: 'uuid',
          },
        },
        key: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        value_type: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            isIn: [['string', 'int', 'double', 'bool', 'array']],
          },
        },
        string_value: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        int_value: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        double_value: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        bool_value: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        array_value: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'ResourceAttribute',
        tableName: 'resource_attribute',
        schema: 'open_telemetry',
        timestamps: false,
      }
    )
  }
}