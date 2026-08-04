const winston = require('winston');
const chalk = require('chalk');

function initLogger() {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
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

  logger.success = (msg) => logger.info(chalk.green(`✅ ${msg}`));
  logger.warn = (msg) => logger.warn(chalk.yellow(`⚠️  ${msg}`));
  logger.error = (msg) => logger.error(chalk.red(`❌ ${msg}`));

  return logger;
}

module.exports = { initLogger };

