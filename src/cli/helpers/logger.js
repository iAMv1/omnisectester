const winston = require('winston');
const chalk = require('chalk');

function createLogger() {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.printf(({ level, message, timestamp }) => {
            const colors = {
              error: 'red',
              warn: 'yellow',
              info: 'cyan',
              debug: 'gray'
            };
            const color = colors[level] || 'white';
            return `${timestamp} ${chalk[color](`[${level.toUpperCase()}]`)}: ${message}`;
          })
        )
      })
    ]
  });

  // Distinct method names avoid clobbering winston's own warn/error
  // (the old code reassigned logger.warn to call itself -> stack overflow).
  logger.success = (msg) => logger.info(chalk.green(`✅ ${msg}`));
  const originalWarn = logger.warn.bind(logger);
  const originalError = logger.error.bind(logger);
  logger.warn = (msg) => originalWarn(chalk.yellow(`⚠️  ${msg}`));
  logger.error = (msg) => originalError(chalk.red(`❌ ${msg}`));

  return logger;
}

// Shared singleton. Export the logger instance AS the module so that
// `const logger = require('./logger'); logger.warn(...)` works at every
// call site (environment.js / dependencies.js / validators.js pattern),
// while `{ initLogger }` destructuring keeps working via the attached fn.
// A previous "lazy getter" version only added a property named `logger`
// on the exports object - call sites still crashed with
// "logger.success is not a function".
let singleton = null;

function initLogger() {
  if (!singleton) {
    singleton = createLogger();
  }
  return singleton;
}

module.exports = initLogger();
module.exports.initLogger = initLogger;
