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

// Shared singleton so helpers can `require('./logger').logger`
// without re-creating transports on every import.
let singleton = null;

function initLogger() {
  if (!singleton) {
    singleton = createLogger();
  }
  return singleton;
}

module.exports = { initLogger };

// Lazy getter keeps `logger.warn(...)` call sites working.
Object.defineProperty(module.exports, 'logger', {
  get: () => initLogger(),
  enumerable: true
});
