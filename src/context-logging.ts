import { PassThrough } from "stream";
import { Logger as _Logger } from "pino";
import { SimpleLogger, ErrorInfo, Info, LoggerSetup } from "./simple-logging";

interface LogStreamContextManager {
  /** @field unique identifier for the log context */
  executionId: string;
}

export class ContextLogger extends SimpleLogger {
  private logStreams = new Map<string, PassThrough>();
  private static LOG_SEP = "<LOGEND>";

  constructor(
    /** 
     * Enables logging in different contexts and makes it possible to store debug logs in a stream
     * that will be dumped if some error occours.
     * @param {LoggerSetup} setup - Logger's configuration.
     * @param {LogStreamContextManager} logContextManager - Used to manage context information for the logs.
     * @param {boolean} enableLogStreams - When true enables debug logs to be stored and dumped if some error occours. Defaults to true
     */    

    setup: LoggerSetup,
    private logContextManager: LogStreamContextManager,
    private enableLogStreams: boolean = true
  ) {
    super(setup);
  }

  public createLogStream(): void {
    /**
     * Creates a log stream for the current logging context.
     * @summary Use this to create a stream dedicated to store logs in a specific context.
     * @return {void}
     */

    if (!this.logStreams.has(this.logContextManager.executionId)) {
      this.logStreams.set(
        this.logContextManager!.executionId,
        new PassThrough()
      );
    }
  }

  public deleteLogStream(): void {
    /**
     * Deletes the log stream for the current logging context.
     * @summary It is very important to exclude your log stream when your flow ends, otherwise your memory may be in trouble.
     * @return {void}
     */
    

    this.logStreams.delete(this.logContextManager.executionId);
  }

  public debug(info: Info): void {
    /**
     * Stores log registers in the current context's stream.
     * @summary It logs in the debug level when the `enableLogStreams` param is false
     * @param {Info} info - The information you want to go inside the log.
     * @return {void}
     */

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

  public error(info: ErrorInfo): void {
    /**
     * Logs the error that occourred and then dumps all information in the current context's log stream.
     * @summary It only logs in the error level if the `enableLogStreams` param is false.
     * @param {Info} info - The information you want to go inside the log.
     * @return {void}
     */

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
