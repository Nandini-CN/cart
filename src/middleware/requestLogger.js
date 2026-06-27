const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Feature X: Request Logging Middleware
 *
 * WHY: Observability is a production necessity. Request logs enable:
 *   - Debugging errors with full request context (method, path, user, latency)
 *   - Performance profiling to catch slow endpoints
 *   - Audit trails for cart mutations (who changed what, when)
 *   - Incident post-mortems using structured log queries
 *
 * IMPLEMENTATION:
 *   - morgan: HTTP request/response logging (format, timing)
 *   - winston: Structured JSON logger (levels, transports, file rotation)
 *   - Dev mode: colorized human-readable output to stdout
 *   - Production: JSON logs to file (queryable by log aggregators like Loki/CloudWatch)
 */

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Winston logger — two transports: console + file
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) =>
                  `${timestamp} [${level}]: ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta) : ''
                  }`
              )
            ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

// Custom morgan token: extract userId from session-resolved req object
morgan.token('user-id', (req) => req.userId || 'anonymous');
morgan.token('session', (req) => {
  const token = req.headers['x-session-token'];
  return token ? token.substring(0, 8) + '...' : 'none';
});

// Morgan format: includes custom userId and session tokens
const morganFormat =
  process.env.NODE_ENV === 'production'
    ? ':remote-addr :method :url :status :res[content-length] :response-time ms user=:user-id session=:session'
    : ':method :url :status :response-time ms - :res[content-length] user=:user-id';

// Pipe morgan output through winston
const morganMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
});

module.exports = { morganMiddleware, logger };
