

import { Model, DataTypes, UUIDV4 } from "sequelize"

export class CommonModel extends Model {
  public uuid!: string
  public created_at!: number // UTC timestamp
  public updated_at!: number // UTC timestamp
}

export const commonFields = {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
}
