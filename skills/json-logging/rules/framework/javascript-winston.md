# Node.js Structured Logging with Winston
**Impact:** CRITICAL - Enables production-ready structured JSON logging in Node.js applications

**Problem:**
Node.js applications often use console.log or basic logging libraries that produce unstructured text logs. This makes debugging production issues difficult, prevents effective log aggregation, and hinders monitoring and alerting capabilities. Without structured logging, teams cannot perform efficient log analysis or implement reliable observability.

**Solution:**
Implement Winston with JSON formatting and structured log entries for comprehensive Node.js application logging with proper log levels, metadata enrichment, and integration with log aggregation systems.

## ✅ Correct: Winston structured logging

### 1. Basic Winston setup with JSON
```javascript
const winston = require('winston');

// Create structured logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss.sssZ'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'user-service',
    version: '1.2.3',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),
    new winston.transports.File({
      filename: 'app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Usage
logger.info('Application started', {
  port: 3000,
  host: '0.0.0.0',
  startup_time_ms: 1250
});

logger.error('Database connection failed', {
  error: 'Connection timeout',
  database_host: 'localhost',
  database_port: 5432,
  retry_count: 3
});
```

### 2. Request context middleware (Express)
```javascript
const express = require('express');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();

// Add request context to all logs
const requestContext = Symbol('requestContext');

// Request logging middleware
app.use((req, res, next) => {
  // Generate correlation and request IDs
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const requestId = uuidv4();

  // Set request context
  req[requestContext] = {
    correlation_id: correlationId,
    request_id: requestId,
    method: req.method,
    url: req.originalUrl,
    user_agent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    user_id: req.user?.id || null,
    session_id: req.session?.id || null
  };

  // Add to response for access in other middleware
  res.locals.correlationId = correlationId;
  res.locals.requestId = requestId;

  next();
});

// Child logger with request context
const createRequestLogger = (req) => {
  const context = req[requestContext];
  return logger.child({
    correlation_id: context.correlation_id,
    request_id: context.request_id,
    user_id: context.user_id,
    session_id: context.session_id
  });
};

// Route logging
app.get('/api/users/:id', (req, res) => {
  const reqLogger = createRequestLogger(req);

  reqLogger.info('Fetching user', {
    user_id: req.params.id,
    action: 'user_fetch',
    resource_type: 'user'
  });

  // Simulate user fetch
  const user = { id: req.params.id, name: 'John Doe' };

  reqLogger.info('User fetched successfully', {
    user_id: user.id,
    response_size_bytes: JSON.stringify(user).length,
    cache_hit: false
  });

  res.json(user);
});

// Error logging middleware
app.use((error, req, res, next) => {
  const reqLogger = createRequestLogger(req);

  reqLogger.error('Request failed', {
    error: {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      status_code: error.status || 500
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body_size: req.get('content-length'),
      query_params: req.query
    },
    performance: {
      response_time_ms: Date.now() - new Date(req[requestContext].timestamp).getTime()
    }
  });

  res.status(error.status || 500).json({
    error: 'Internal server error',
    request_id: req[requestContext].request_id
  });
});

module.exports = app;
```

### 3. Advanced Winston configuration
```javascript
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const DailyRotateFile = require('winston-daily-rotate-file');

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    silly: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    silly: 'gray'
  }
};

// Add colors
winston.addColors(customLevels.colors);

// Error stack format
const errorStackFormat = winston.format((info) => {
  if (info.stack) {
    info.message = `${info.message}\n${info.stack}`;
  }
  return info;
});

// Host metadata
const hostMeta = {
  hostname: os.hostname(),
  platform: os.platform(),
  arch: os.arch(),
  node_version: process.version,
  pid: process.pid
};

// Production logger configuration
const prodLogger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    errorStackFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'api-service',
    version: '1.2.3',
    environment: 'production',
    ...hostMeta
  },
  transports: [
    // Console for development
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // Daily rotating files
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),

    // Error log file
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    }),

    // Elasticsearch transport
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: 'http://elasticsearch:9200'
      },
      indexPrefix: 'logs-api-service',
      indexSuffixPattern: 'YYYY-MM-DD'
    })
  ]
});

// Development logger (prettier output)
const devLogger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `${timestamp} ${level}: ${message}${metaStr}`;
    })
  ),
  defaultMeta: {
    service: 'api-service',
    environment: 'development'
  },
  transports: [
    new winston.transports.Console({
      level: 'silly'
    })
  ]
});

// Export appropriate logger
const logger = process.env.NODE_ENV === 'production' ? prodLogger : devLogger;

module.exports = logger;
```

### 4. Performance logging and monitoring
```javascript
const winston = require('winston');
const responseTime = require('response-time');

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationNs = Number(end - start);
    const durationMs = durationNs / 1000000; // Convert to milliseconds

    const reqLogger = logger.child({
      correlation_id: req.headers['x-correlation-id'],
      request_id: req.requestId
    });

    reqLogger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Math.round(durationMs * 100) / 100,
      response_size_bytes: res.get('Content-Length'),
      user_agent: req.get('User-Agent'),
      ip: req.ip,
      performance: {
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        cpu_usage: process.cpuUsage()
      }
    });
  });

  next();
};

// Database operation logging
class DatabaseLogger {
  constructor(db) {
    this.db = db;
  }

  logQuery(query, params, duration, result) {
    logger.info('Database query executed', {
      query: query.substring(0, 500), // Truncate long queries
      params_count: params?.length || 0,
      duration_ms: Math.round(duration * 100) / 100,
      result_rows: result?.rowCount || 0,
      success: !result?.error,
      error: result?.error?.message,
      connection_pool: {
        total: this.db.totalCount,
        idle: this.db.idleCount,
        waiting: this.db.waitingCount
      }
    });
  }
}

// Cache operation logging
class CacheLogger {
  logOperation(operation, key, duration, hit = null) {
    logger.info('Cache operation', {
      operation, // get, set, delete
      key: key.substring(0, 100), // Truncate long keys
      duration_ms: Math.round(duration * 100) / 100,
      hit,
      cache_stats: {
        hits: this.cache?.stats?.hits || 0,
        misses: this.cache?.stats?.misses || 0,
        hit_rate: this.cache?.stats?.hitRate || 0
      }
    });
  }
}

// External API call logging
const logExternalApiCall = async (url, method, options) => {
  const start = process.hrtime.bigint();

  try {
    const response = await fetch(url, { method, ...options });
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1000000;

    logger.info('External API call', {
      url,
      method,
      status_code: response.status,
      duration_ms: Math.round(durationMs * 100) / 100,
      success: response.ok,
      response_size_bytes: response.headers.get('content-length')
    });

    return response;
  } catch (error) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1000000;

    logger.error('External API call failed', {
      url,
      method,
      duration_ms: Math.round(durationMs * 100) / 100,
      error: error.message
    });

    throw error;
  }
};
```

### 5. Error handling and logging
```javascript
const winston = require('winston');

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      versions: process.versions
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
      free_memory_mb: Math.round(os.freemem() / 1024 / 1024)
    }
  });

  // Give some time for logging to complete
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    error: {
      type: reason.constructor.name,
      message: reason.message || reason,
      stack: reason.stack
    },
    promise: promise.toString(),
    process_info: {
      pid: process.pid,
      versions: process.versions
    }
  });
});

// Async error boundary
const asyncErrorBoundary = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async error in request handler', {
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack
        },
        request: {
          method: req.method,
          url: req.originalUrl,
          correlation_id: req.headers['x-correlation-id'],
          request_id: req.requestId
        }
      });

      next(error);
    });
  };
};

// Usage in routes
app.get('/api/users', asyncErrorBoundary(async (req, res) => {
  const users = await getUsers();
  res.json(users);
}));
```

### 6. Log aggregation and shipping
```javascript
const winston = require('winston');
const { LogstashTransport } = require('winston-logstash-transport');

// Logstash configuration
const logstashTransport = new LogstashTransport({
  host: process.env.LOGSTASH_HOST || 'logstash',
  port: process.env.LOGSTASH_PORT || 5044,
  ssl: process.env.LOGSTASH_SSL === 'true',
  ssl_key: process.env.LOGSTASH_SSL_KEY,
  ssl_cert: process.env.LOGSTASH_SSL_CERT,
  ca: process.env.LOGSTASH_CA,
  timeout: 10000
});

// Fluentd configuration
const { FluentTransport } = require('winston-fluentd');
const fluentTransport = new FluentTransport('api-service', {
  host: process.env.FLUENTD_HOST || 'fluentd',
  port: process.env.FLUENTD_PORT || 24224,
  timeout: 3.0,
  requireAckResponse: true
});

// Production logger with multiple transports
const prodLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    logstashTransport,
    fluentTransport,
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD'
    })
  ]
});

// Handle transport errors
logstashTransport.on('error', (error) => {
  console.error('Logstash transport error:', error);
});

fluentTransport.on('error', (error) => {
  console.error('Fluentd transport error:', error);
});
```

## ❌ Incorrect: Winston logging mistakes

```javascript
// ❌ Using console.log
console.log('User logged in:', userId);
// No structure, levels, or metadata

// ❌ String interpolation
logger.info(`User ${userId} logged in from ${ipAddress}`);
// Not queryable, loses structured data

// ❌ Not using metadata
logger.info('Payment processed', paymentId);
// Missing amount, currency, method, etc.

// ❌ Ignoring errors in logging
try {
  riskyOperation();
} catch (error) {
  logger.error('Operation failed');
  // Missing error details and stack trace
}

// ❌ Synchronous logging in hot paths
app.get('/api/fast', (req, res) => {
  logger.info('Fast request'); // Blocks response
  res.send('ok');
});
```

## Key Benefits
- **Structured output**: JSON format enables querying and analysis
- **Multiple transports**: Console, files, ELK stack, Fluentd
- **Request correlation**: Automatic request context in all logs
- **Error handling**: Comprehensive error logging with stack traces
- **Performance monitoring**: Built-in performance and memory tracking
- **Production ready**: Log rotation, aggregation, and shipping</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/framework/javascript-winston.md