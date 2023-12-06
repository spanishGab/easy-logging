import { PassThrough } from "stream";
import { Logger as _Logger } from "pino";
import { SimpleLogger, ErrorInfo, Info, LoggerSetup } from "./simple-logging";

export class ContextLogger<
  ContextManager extends {
    /** @field unique identifier for the log context */
    executionId: string;
  }
> extends SimpleLogger {
  private logStreams = new Map<string, PassThrough>();
  private static LOG_SEP = "<LOGEND>";

  /**
   * Enables logging in different contexts and makes it possible to store debug logs in a stream
   * that will be dumped if some error occours.
   * @param {LoggerSetup} setup - Logger's configuration.
   * @param {ContextManager} logContextManager - Used to manage context information for the logs.
   * @param {boolean} enableLogStreams - When true enables debug logs to be stored and dumped if some error occours. Defaults to true
   */
  constructor(
    setup: LoggerSetup,
    private logContextManager: ContextManager,
    private enableLogStreams: boolean = true
  ) {
    super(setup);
  }

  /**
   * Creates a log stream for the current logging context.
   * @summary Use this to create a stream dedicated to store logs in a specific context.
   * @return {void}
   */
  public createLogStream(): void {
    if (!this.logStreams.has(this.logContextManager.executionId)) {
      this.logStreams.set(
        this.logContextManager!.executionId,
        new PassThrough()
      );
    }
  }

  /**
   * Deletes the log stream for the current logging context.
   * @summary It is very important to exclude your log stream when your flow ends, otherwise your memory may be in trouble.
   * @return {void}
   */
  public deleteLogStream(): void {
    this.logStreams.delete(this.logContextManager.executionId);
  }

  /**
   * Stores log registers in the current context's stream.
   * @summary It logs in the debug level when the `enableLogStreams` param is false
   * @param {Info} info - The information you want to go inside the log.
   * @return {void}
   */
  public debug(info: Info): void {
    if (!this.enableLogStreams) {
      super.debug(info);
      return;
    }

    this.createLogStream();
    const logStream = this.logStreams.get(this.logContextManager.executionId);
    if (this.hasStreamedLogs()) {
      logStream?.write(ContextLogger.LOG_SEP);
    }
    logStream?.write(JSON.stringify(this.formatLog(info)));
  }

  /**
   * Logs the error that occourred and then dumps all information in the current context's log stream.
   * @summary It only logs in the error level if the `enableLogStreams` param is false.
   * @param {Info} info - The information you want to go inside the log.
   * @return {void}
   */
  public error(info: ErrorInfo): void {
    super.error(info);

    if (this.enableLogStreams && this.hasStreamedLogs()) {
      this.flushLogStream()
        .split(ContextLogger.LOG_SEP)
        .forEach((streamedInfo: string) => {
          this.logger.info(JSON.parse(streamedInfo));
        });
      this.deleteLogStream();
    }
  }

  protected hasStreamedLogs(): boolean {
    const logStream = this.logStreams.get(this.logContextManager!.executionId);
    return !!(logStream?.readable && logStream?.readableLength);
  }

  protected flushLogStream(): string {
    return String(
      this.logStreams.get(this.logContextManager!.executionId)?.read() ?? ""
    );
  }
}
