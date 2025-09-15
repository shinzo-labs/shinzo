"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = exports.handleFetchUser = exports.handleVerifyUser = exports.handleLogin = exports.handleCreateUser = exports.verifyUserSchema = exports.loginSchema = exports.createUserSchema = void 0;
const yup = __importStar(require("yup"));
const models_1 = require("../models");
const logger_1 = require("../logger");
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
const config_1 = require("../config");
exports.createUserSchema = yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
}).required();
exports.loginSchema = yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().required('Password is required'),
}).required();
exports.verifyUserSchema = yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    verification_token: yup.string().required('Verification token is required'),
}).required();
function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}
function generateEmailToken() {
    return crypto.randomBytes(32).toString('hex');
}
function generateJWT(user) {
    return jwt.sign({
        uuid: user.uuid,
        email: user.email,
        verified: user.verified
    }, config_1.JWT_SECRET, { expiresIn: '24h' });
}
const handleCreateUser = async (request) => {
    try {
        const existingUser = await models_1.User.findOne({ where: { email: request.email } });
        if (existingUser) {
            return {
                response: 'Email already exists',
                error: true,
                status: 409
            };
        }
        const salt = generateSalt();
        const passwordHash = hashPassword(request.password, salt);
        const emailToken = generateEmailToken();
        const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const user = await models_1.User.create({
            email: request.email,
            password_hash: passwordHash,
            password_salt: salt,
            email_token: emailToken,
            email_token_expiry: emailTokenExpiry,
            verified: false,
        });
        logger_1.logger.info({ message: 'User created successfully', email: request.email, uuid: user.uuid });
        return {
            response: {
                message: 'User account created successfully, verification email sent',
                uuid: user.uuid,
                email: user.email,
                verification_token: emailToken // In production, this would be sent via email
            },
            status: 201
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Error creating user', error });
        return {
            response: 'Error creating user account',
            error: true,
            status: 500
        };
    }
};
exports.handleCreateUser = handleCreateUser;
const handleLogin = async (request) => {
    try {
        const user = await models_1.User.findOne({ where: { email: request.email } });
        if (!user) {
            return {
                response: 'Invalid credentials',
                error: true,
                status: 401
            };
        }
        const passwordHash = hashPassword(request.password, user.password_salt);
        if (passwordHash !== user.password_hash) {
            return {
                response: 'Invalid credentials',
                error: true,
                status: 401
            };
        }
        const token = generateJWT(user);
        return {
            response: {
                token,
                user: {
                    uuid: user.uuid,
                    email: user.email,
                    verified: user.verified
                }
            },
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Login error', error });
        return {
            response: 'Error processing login',
            error: true,
            status: 500
        };
    }
};
exports.handleLogin = handleLogin;
const handleVerifyUser = async (request) => {
    try {
        const user = await models_1.User.findOne({ where: { email: request.email } });
        if (!user) {
            return {
                response: 'User not found',
                error: true,
                status: 404
            };
        }
        if (user.verified) {
            return {
                response: 'Email already verified',
                error: true,
                status: 409
            };
        }
        if (user.email_token !== request.verification_token) {
            return {
                response: 'Invalid verification token',
                error: true,
                status: 400
            };
        }
        if (new Date() > user.email_token_expiry) {
            return {
                response: 'Verification token has expired',
                error: true,
                status: 400
            };
        }
        await user.update({
            verified: true,
            email_token: generateEmailToken(), // Generate new token for security
            email_token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        return {
            response: {
                message: 'Email verified successfully',
                verified: true
            },
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Email verification error', error });
        return {
            response: 'Error verifying email',
            error: true,
            status: 500
        };
    }
};
exports.handleVerifyUser = handleVerifyUser;
const handleFetchUser = async (userUuid) => {
    try {
        const user = await models_1.User.findByPk(userUuid);
        if (!user) {
            return {
                response: 'User not found',
                error: true,
                status: 404
            };
        }
        return {
            response: {
                uuid: user.uuid,
                email: user.email,
                verified: user.verified,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Error fetching user', error });
        return {
            response: 'Error fetching user profile',
            error: true,
            status: 500
        };
    }
};
exports.handleFetchUser = handleFetchUser;
const verifyJWT = (token) => {
    try {
        const decoded = jwt.verify(token, config_1.JWT_SECRET);
        return decoded;
    }
    catch (error) {
        logger_1.logger.error({ message: 'JWT verification failed', error });
        return null;
    }
};
exports.verifyJWT = verifyJWT;
