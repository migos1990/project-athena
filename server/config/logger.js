/**
 * Structured logger — Pino.
 *
 * In development (NODE_ENV !== 'production') pretty-prints with colors.
 * In production outputs newline-delimited JSON suitable for log aggregators
 * (Datadog, CloudWatch, ELK, etc.).
 *
 * Usage:
 *   const logger = require('./config/logger');
 *   logger.info({ event: 'demo_started', demoId }, 'Demo started');
 *   logger.error({ err }, 'Something went wrong');
 */

const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname'
          }
        }
      })
});

module.exports = logger;
