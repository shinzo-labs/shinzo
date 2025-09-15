import { Sequelize } from "sequelize"
import { DATABASE_URL, TZ } from "./config"
import { logger } from "./logger"

export const dbClient = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true
  },
  timezone: TZ,
  logging: logger.debug.bind(logger),
  benchmark: true,
  logQueryParameters: true,
  pool: {
    max: 150, // max number of connections
    idle: 5_000,// max time (ms) that a connection can be idle before being released
    acquire: 30_000,// max time (ms) that pool will try to get connection before throwing error
    evict: 1_000// time interval (ms) after which sequelize-pool will remove idle connections
  }
})
