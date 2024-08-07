import { Logger, pino } from "pino";
import { datetime } from "./utils/DateTime";

export interface ISerializedError {
  /** @field The error type */
  type: string;
  /** @field The error message */
  message: string;
  [key: string]: unknown;
}

export type Info = Record<string, unknown> & { name: string; details?: string };

export type ErrorInfo = Info & { error: Error };

export type Log = {
  [key: string]: unknown;
  time: string;
  event: Record<string, unknown> & { name: string; details?: string };
};

export type ErrorLog = {
  [key: string]: unknown;
  time: Log["time"];
  event: Log["event"] & { error: ISerializedError };
};

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerSetup {
  /** @field true for logging in a pretty formatted string, false for logging in JSON. Defaults to false */
  prettyLog?: boolean;
  /** @field The level from which logs are going to be watched. Defaults to info */
  level?: LogLevel;
  /** @field true to enable the logs, false for disabling them. Defaults to true */
  isEnabled?: boolean;
  /**
   * @summary Must produce an object containing fields that must be included in each log register.
   * @return {Record<string, string>} an object containing fields that must be included in each log register.
   * If not specified, nothig will be added to the log register.
   */
  logAttachments?(): Record<string, string>;
}

interface ILogger {
  debug(log: Info): void;
  info(log: Info): void;
  warn(log: Info): void;
  error(log: ErrorInfo): void;
}

export class SimpleLogger implements ILogger {
  protected logger: Logger;
  protected readonly instance = pino;

  /**
   * Enables logging in the console in four levels: debug, info, warn and error
   * @param {LoggerSetup} setup - Logger's configuration.
   */
  constructor(setup: LoggerSetup) {
    this.logger = this.setup(setup);
  }

  /**
   * Logs in the debug level.
   * @summary Use this to help find bugs or understand the code flow.
   * @param {Info} info - The information you want to go inside the log.
   * @return {void}
   */
  public debug(info: Info): void {
    this.logger.debug(this.formatLog(info));
  }

  /**
   * Logs in the information level.
   * @summary Use this to inform about important things in your flow.
   * @param {Info} info - The information you want to go inside the log.
   * @return {void}
   */
  public info(info: Info): void {
    this.logger.info(this.formatLog(info));
  }

  /**
   * Logs in the warning level.
   * @summary Use this to warn that something unexpected happened in the flow.
   * @param {Info} info - The information you want to go inside the log.
   * @return {void}
   */
  public warn(info: Info): void {
    this.logger.warn(this.formatLog(info));
  }

  /**
   * Logs in the error level.
   * @summary Use this to inform that an error occourred in the flow.
   * @param {Info} info - The information you want to go inside the log.
   * @return {void}
   */
  public error(info: ErrorInfo): void {
    this.logger.error(this.formatErrorLog(info));
  }

  protected setup(params: LoggerSetup): Logger {
    const { prettyLog, level, logAttachments, isEnabled } = params;

    return this.instance({
      transport: !!prettyLog
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
            },
          }
        : undefined,
      level: level ?? "info",
      base: undefined,
      mixin() {
        return !!logAttachments ? logAttachments() : {};
      },
      formatters: {
        level(label: string, _: number) {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: false,
      enabled: isEnabled ?? true,
    });
  }

  protected serializeError(
    error: Error & { toJSON?(): object }
  ): ISerializedError {
    let serializedError: ISerializedError = {
      type: error.name,
      message: error.message,
    };
    if (typeof error.toJSON === 'function') {
      serializedError = {
        ...serializedError,
        ...error.toJSON(),
      };
    }
    return serializedError;
  }

  protected formatLog(info: Info): Log {
    return { time: datetime.nowUTC(), event: { ...info } };
  }

  protected formatErrorLog(info: ErrorInfo): ErrorLog {
    const { error, ...remainingInfo } = info;
    return {
      time: datetime.nowUTC(),
      event: {
        ...remainingInfo,
        error: this.serializeError(error),
      },
    };
  }
}
