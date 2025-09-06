import chalk from 'chalk';
import winston from 'winston';
import * as path from 'path';
import * as os from 'os';

export class Logger {
  private winston: winston.Logger;
  private context: string;

  constructor(context: string) {
    this.context = context;

    const logLevel = process.env.FAJ_LOG_LEVEL || 'info';
    const logDir = path.join(os.homedir(), '.faj', 'logs');

    this.winston = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { context },
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
        }),
      ],
    });

    // Add console transport for development - disabled to prevent duplicate output
    // Console output is handled manually in each log method
    // if (process.env.NODE_ENV !== 'production') {
    //   this.winston.add(
    //     new winston.transports.Console({
    //       format: winston.format.combine(
    //         winston.format.colorize(),
    //         winston.format.simple()
    //       ),
    //     })
    //   );
    // }
  }

  info(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production' && !process.env.FAJ_QUIET) {
      console.log(chalk.blue(`[${this.context}]`), message);
    }
    this.winston.info(message, meta);
  }

  success(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production' && !process.env.FAJ_QUIET) {
      console.log(chalk.green(`✓ ${message}`));
    }
    this.winston.info(`SUCCESS: ${message}`, meta);
  }

  warn(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production' && !process.env.FAJ_QUIET) {
      console.warn(chalk.yellow(`⚠ ${message}`));
    }
    this.winston.warn(message, meta);
  }

  error(message: string, error?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error(chalk.red(`✗ ${message}`));
      if (error && process.env.FAJ_DEBUG) {
        console.error(error);
      }
    }
    this.winston.error(message, error);
  }

  debug(message: string, meta?: any): void {
    if (process.env.FAJ_DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
    this.winston.debug(message, meta);
  }
}