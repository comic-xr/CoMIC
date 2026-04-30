/**
 * Centralized logging: uses config logging flags only. No hard-coded log levels.
 */

import { appConfig } from '@/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function shouldLog(level: LogLevel): boolean {
  if (!appConfig.logging.enabled) return false;
  const configLevel = appConfig.logging.level;
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(configLevel);
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) console.debug(`[CIVA] ${message}`, ...args);
  },
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) console.info(`[CIVA] ${message}`, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) console.warn(`[CIVA] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) console.error(`[CIVA] ${message}`, ...args);
  },
  performance(message: string, ...args: unknown[]): void {
    if (appConfig.logging.enabled && appConfig.logging.logPerformance) {
      console.debug(`[CIVA perf] ${message}`, ...args);
    }
  },
  interactions(message: string, ...args: unknown[]): void {
    if (appConfig.logging.enabled && appConfig.logging.logInteractions) {
      console.debug(`[CIVA interaction] ${message}`, ...args);
    }
  },
};
