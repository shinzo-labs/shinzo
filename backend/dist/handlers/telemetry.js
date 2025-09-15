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
exports.handleFetchMetrics = exports.handleFetchSpans = exports.handleFetchTraces = exports.handleFetchResources = exports.fetchDataSchema = void 0;
const yup = __importStar(require("yup"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const logger_1 = require("../logger");
exports.fetchDataSchema = yup.object({
    start_time: yup.string().required('Start time is required'),
    end_time: yup.string().required('End time is required'),
}).required();
const handleFetchResources = async (userUuid) => {
    try {
        const resources = await models_1.Resource.findAll({
            where: { user_uuid: userUuid },
            include: [
                {
                    model: models_1.ResourceAttribute,
                    as: 'attributes',
                    required: false
                }
            ],
            order: [['last_seen', 'DESC']]
        });
        return {
            response: resources.map(resource => ({
                uuid: resource.uuid,
                service_name: resource.service_name,
                service_version: resource.service_version,
                service_namespace: resource.service_namespace,
                first_seen: resource.first_seen,
                last_seen: resource.last_seen,
                created_at: resource.created_at,
                updated_at: resource.updated_at,
                attributes: resource.attributes || []
            })),
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Error fetching resources', error });
        return {
            response: 'Error fetching resources',
            error: true,
            status: 500
        };
    }
};
exports.handleFetchResources = handleFetchResources;
const handleFetchTraces = async (userUuid, query) => {
    try {
        const startTime = new Date(query.start_time);
        const endTime = new Date(query.end_time);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return {
                response: 'Invalid time format',
                error: true,
                status: 400
            };
        }
        const userResources = await models_1.Resource.findAll({
            where: { user_uuid: userUuid },
            attributes: ['uuid']
        });
        const resourceUuids = userResources.map(r => r.uuid);
        if (resourceUuids.length === 0) {
            return {
                response: [],
                status: 200
            };
        }
        const traces = await models_1.Trace.findAll({
            where: {
                resource_uuid: { [sequelize_1.Op.in]: resourceUuids },
                start_time: {
                    [sequelize_1.Op.gte]: startTime,
                    [sequelize_1.Op.lte]: endTime
                }
            },
            include: [
                {
                    model: models_1.Resource,
                    as: 'resource',
                    required: true
                }
            ],
            order: [['start_time', 'DESC']]
        });
        return {
            response: traces.map(trace => ({
                uuid: trace.uuid,
                start_time: trace.start_time,
                end_time: trace.end_time,
                service_name: trace.service_name,
                operation_name: trace.operation_name,
                status: trace.status,
                span_count: trace.span_count,
                duration_ms: trace.end_time && trace.start_time
                    ? new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime()
                    : null,
                created_at: trace.created_at,
                updated_at: trace.updated_at
            })),
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Error fetching traces', error });
        return {
            response: 'Error fetching traces',
            error: true,
            status: 500
        };
    }
};
exports.handleFetchTraces = handleFetchTraces;
const handleFetchSpans = async (userUuid, query) => {
    try {
        const startTime = new Date(query.start_time);
        const endTime = new Date(query.end_time);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return {
                response: 'Invalid time format',
                error: true,
                status: 400
            };
        }
        const userResources = await models_1.Resource.findAll({
            where: { user_uuid: userUuid },
            attributes: ['uuid']
        });
        const resourceUuids = userResources.map(r => r.uuid);
        if (resourceUuids.length === 0) {
            return {
                response: [],
                status: 200
            };
        }
        const spans = await models_1.Span.findAll({
            where: {
                start_time: {
                    [sequelize_1.Op.gte]: startTime,
                    [sequelize_1.Op.lte]: endTime
                }
            },
            include: [
                {
                    model: models_1.Trace,
                    as: 'trace',
                    required: true,
                    where: {
                        resource_uuid: { [sequelize_1.Op.in]: resourceUuids }
                    }
                },
                {
                    model: models_1.SpanAttribute,
                    as: 'attributes',
                    required: false
                }
            ],
            order: [['start_time', 'DESC']]
        });
        return {
            response: spans.map(span => ({
                uuid: span.uuid,
                trace_uuid: span.trace_uuid,
                parent_span_uuid: span.parent_span_uuid,
                operation_name: span.operation_name,
                start_time: span.start_time,
                end_time: span.end_time,
                duration_ms: span.duration_ms,
                status_code: span.status_code,
                status_message: span.status_message,
                span_kind: span.span_kind,
                service_name: span.service_name,
                created_at: span.created_at,
                updated_at: span.updated_at,
                attributes: span.attributes || []
            })),
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Error fetching spans', error });
        return {
            response: 'Error fetching spans',
            error: true,
            status: 500
        };
    }
};
exports.handleFetchSpans = handleFetchSpans;
const handleFetchMetrics = async (userUuid, query) => {
    try {
        const startTime = new Date(query.start_time);
        const endTime = new Date(query.end_time);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return {
                response: 'Invalid time format',
                error: true,
                status: 400
            };
        }
        const userResources = await models_1.Resource.findAll({
            where: { user_uuid: userUuid },
            attributes: ['uuid']
        });
        const resourceUuids = userResources.map(r => r.uuid);
        if (resourceUuids.length === 0) {
            return {
                response: [],
                status: 200
            };
        }
        const metrics = await models_1.Metric.findAll({
            where: {
                resource_uuid: { [sequelize_1.Op.in]: resourceUuids },
                timestamp: {
                    [sequelize_1.Op.gte]: startTime,
                    [sequelize_1.Op.lte]: endTime
                }
            },
            include: [
                {
                    model: models_1.Resource,
                    as: 'resource',
                    required: true
                },
                {
                    model: models_1.MetricAttribute,
                    as: 'attributes',
                    required: false
                }
            ],
            order: [['timestamp', 'DESC']]
        });
        return {
            response: metrics.map(metric => ({
                uuid: metric.uuid,
                name: metric.name,
                description: metric.description,
                unit: metric.unit,
                metric_type: metric.metric_type,
                timestamp: metric.timestamp,
                value: metric.value,
                scope_name: metric.scope_name,
                scope_version: metric.scope_version,
                created_at: metric.created_at,
                updated_at: metric.updated_at,
                attributes: metric.attributes || []
            })),
            status: 200
        };
    }
    catch (error) {
        logger_1.logger.error({ message: 'Error fetching metrics', error });
        return {
            response: 'Error fetching metrics',
            error: true,
            status: 500
        };
    }
};
exports.handleFetchMetrics = handleFetchMetrics;
