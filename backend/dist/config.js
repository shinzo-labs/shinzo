"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIME_RANGE = exports.ENABLE_REALTIME = exports.MAX_CACHE_AGE = exports.REFRESH_INTERVAL = exports.API_BASE_URL = exports.ENABLE_IP_RATE_LIMIT = exports.RATE_LIMIT_BY_KEY = exports.RATE_LIMIT_MAX = exports.RATE_LIMIT_WINDOW = exports.API_KEY_STORE = exports.JWT_SECRET = exports.AUTH_PROVIDER = exports.MAX_BATCH_SIZE = exports.BATCH_TIMEOUT = exports.ENABLE_COMPRESSION = exports.RATE_LIMIT_PER_MINUTE = exports.MAX_PAYLOAD_SIZE = exports.TZ = exports.LOG_LEVEL = exports.HTTP_PORT = exports.GRPC_PORT = exports.PORT = exports.DATABASE_URL = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Database Configuration
exports.DATABASE_URL = process.env.DATABASE_URL ?? '';
// Server Configuration
exports.PORT = process.env.PORT ?? '8000';
exports.GRPC_PORT = process.env.GRPC_PORT ?? '4317';
exports.HTTP_PORT = process.env.HTTP_PORT ?? '4318';
exports.LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
exports.TZ = process.env.TZ ?? '';
// OTLP Ingestion Configuration
exports.MAX_PAYLOAD_SIZE = process.env.MAX_PAYLOAD_SIZE ?? '4mb';
exports.RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? '1000');
exports.ENABLE_COMPRESSION = process.env.ENABLE_COMPRESSION === 'true';
exports.BATCH_TIMEOUT = parseInt(process.env.BATCH_TIMEOUT ?? '5000');
exports.MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE ?? '1000');
// Authentication Configuration
exports.AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? 'jwt';
exports.JWT_SECRET = process.env.JWT_SECRET ?? 'default-secret-change-in-production';
exports.API_KEY_STORE = process.env.API_KEY_STORE ?? 'database';
// Rate Limiting Configuration
exports.RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW ?? '60000');
exports.RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '1000');
exports.RATE_LIMIT_BY_KEY = process.env.RATE_LIMIT_BY_KEY === 'true';
exports.ENABLE_IP_RATE_LIMIT = process.env.ENABLE_IP_RATE_LIMIT === 'true';
// Frontend Configuration
exports.API_BASE_URL = process.env.API_BASE_URL ?? `http://localhost:${exports.PORT}`;
exports.REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL ?? '30000');
exports.MAX_CACHE_AGE = parseInt(process.env.MAX_CACHE_AGE ?? '300000');
exports.ENABLE_REALTIME = process.env.ENABLE_REALTIME === 'true';
exports.DEFAULT_TIME_RANGE = process.env.DEFAULT_TIME_RANGE ?? '1h';
