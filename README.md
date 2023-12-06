# Easy logging

Easy logging is a simple logging library built with [pinojs](https://github.com/pinojs). You can use it in two ways: as a simple console logger or as a context logger.

1. [But what is the difference?](#but-what-is-the-difference)
2. [Ok, but how does it works?](#ok-but-how-do-it-works)
3. [Simple logging](#simple-logging)
4. [Context logging](#context-logging)
5. [Docs](#docs)
    * [Simple logging](#simplelogger)
    * [Context logging](#contextlogger)

## But what is the difference?

It is a **simple logger** as it provides you four basic logging methods which enables you to log your system's operations to the console.

It is also a **context logger** as it provides you an extra feature that enables you to log in different contexts (i.e different Web requests) where you need each log to be attached to a specific `executionId`. This allows you to have multiple execution contexts in paralel using, for example, [node:async_hooks](https://nodejs.org/api/async_hooks.html) to manage multiple `executionIds`.

## Ok, but how do it works?

First of all you need to install it using your favorite package manager, go ahead and run the command `npm i less-logging` or `yarn add less-logging` to add it to your project.

Now that we have it installed, let's use it!

## Simple logging

Here is an usage example when all you need is a simple logging feature:

```ts
import { randomUUID } from "crypto";
import { SimpleLogger } from "simple-logging";

class Exc extends Error {
  toJSON() {
    return {
      prop: "Custom Exception message",
    };
  }
}

const executionId = randomUUID();
const logger = new SimpleLogger(
  {
    isEnabled: true, // activates logs
    level: "debug", // tells in which level logs must start
    logAttachments: () => { // defines extra properties to be included in each log register
      return {
        executionId,
        operationType: 'File Processing',
      };
    },
    prettyLog: true, // formats logs in a pretty way
  },
);

logger.debug({ name: "example.log", details: "Debugging" });
logger.info({ name: "example.log", details: "Informing" });
logger.warn({ name: "example.log", details: "Warning" });
logger.error({ name: "example.log.error", error: new Exc("Oops") });
```

Here we're only using all methods `SimpleLogger` provides us to log information in different levels. And this is what we get:

```log
[16:50:01.827] DEBUG:
    executionId: "582ee037-a195-4eca-8277-e8f07fc55b3a"
    operationType: "File Processing"
    event: {
      "name": "example.log",
      "details": "Debugging"
    }
[16:50:01.828] INFO:
    executionId: "582ee037-a195-4eca-8277-e8f07fc55b3a"
    operationType: "File Processing"
    event: {
      "name": "example.log",
      "details": "Informing"
    }
[16:50:01.828] WARN:
    executionId: "582ee037-a195-4eca-8277-e8f07fc55b3a"
    operationType: "File Processing"
    event: {
      "name": "example.log",
      "details": "Warning"
    }
[16:50:01.828] ERROR:
    executionId: "582ee037-a195-4eca-8277-e8f07fc55b3a"
    operationType: "File Processing"
    event: {
      "name": "example.log.error",
      "error": {
        "type": "Error",
        "message": "Oops",
        "prop": "Custom Exception message"
      }
    }
```

Quite *simple*, right? Now let's complicate it a little bit.

## Context logging

When you have different contexts running in paralel maybe you need something more robust to manage your logs:

```ts
import { AsyncLocalStorage } from "async_hooks";
import { ContextLogger } from "context-logging";
import { randomUUID } from "crypto";

const localStorage = new AsyncLocalStorage<Map<string, string>>();

class Ctx {
  get executionId(): string {
    const store = localStorage.getStore();
    return store?.get("executionId") ?? "-";
  }

  set executionId(value: string) {
    const store = localStorage.getStore();
    store?.set("executionId", value);
  }
}

class Exc extends Error {
  toJSON() {
    return {
      prop: "Custom Exception message",
    };
  }
}

const ctx = new Ctx();

const logger = new ContextLogger(
  {
    isEnabled: true, // activates logs
    level: "debug", // tells in which level logs must start
    logAttachments: () => { // defines extra properties to be included in each log register
      return {
        executionId: ctx.executionId,
      };
    },
    prettyLog: true, // formats logs in a pretty way
  },
  ctx, // a class used to manage logging context
  true, // activates logs streaming
);

const fn1 = async () => {
  localStorage.run(new Map().set("executionId", randomUUID()), () => {
    logger.debug({ name: "fn1", details: "Debugging" });
    logger.info({ name: "fn1", details: "Informing" });
    logger.warn({ name: "fn1", details: "Warning" });
    logger.error({ name: "fn1.error", error: new Exc("Oops") });
  });
};

const fn2 = async () => {
  localStorage.run(new Map().set("executionId", randomUUID()), () => {
    logger.debug({ name: "fn2", details: "Debugging" });
    logger.info({ name: "fn2", details: "Informing" });
    logger.warn({ name: "fn2", details: "Warning" });
    logger.error({ name: "fn2.error", error: new Exc("Oops") });
  });
};

Promise.all([fn1(), fn2()]);
```

For this example, we needed a logger that logs information for different contexts separately and only logs <span style="color: purple">DEBUG</span> information if an error occourred. In this case <span style="color: purple">DEBUG</span> information will allways be logged after the first <span style="color: red">ERROR</span> log and using the <span style="color: green">INFO</span> level. And this is what we get:

```log
[17:33:04.006] INFO:
    executionId: "28829ba2-592e-4e6d-a04b-e710fc9db3ce"
    event: {
      "name": "fn1",
      "details": "Informing"
    }
[17:33:04.006] WARN:
    executionId: "28829ba2-592e-4e6d-a04b-e710fc9db3ce"
    event: {
      "name": "fn1",
      "details": "Warning"
    }
[17:33:04.007] ERROR:
    executionId: "28829ba2-592e-4e6d-a04b-e710fc9db3ce"
    event: {
      "name": "fn1.error",
      "error": {
        "type": "Error",
        "message": "Oops",
        "prop": "Custom Exception message"
      }
    }
[17:33:04.004] INFO:
    executionId: "28829ba2-592e-4e6d-a04b-e710fc9db3ce"
    event: {
      "name": "fn1",
      "details": "Debugging"
    }
[17:33:04.007] INFO:
    executionId: "964b8054-451b-454e-b093-350b1850c7ce"
    event: {
      "name": "fn2",
      "details": "Informing"
    }
[17:33:04.007] WARN:
    executionId: "964b8054-451b-454e-b093-350b1850c7ce"
    event: {
      "name": "fn2",
      "details": "Warning"
    }
[17:33:04.007] ERROR:
    executionId: "964b8054-451b-454e-b093-350b1850c7ce"
    event: {
      "name": "fn2.error",
      "error": {
        "type": "Error",
        "message": "Oops",
        "prop": "Custom Exception message"
      }
    }
[17:33:04.007] INFO:
    executionId: "964b8054-451b-454e-b093-350b1850c7ce"
    event: {
      "name": "fn2",
      "details": "Debugging"
    }
```

I know, it's a lot of stuff to get by firts glance, so if you have any doubts take a look at the docs bellow, ok?

## Docs

### SimpleLogger

Enables logging in the console in four levels: debug, info, warn and error.

```js
/**
 * @param {LoggerSetup} setup - Logger's configuration.
 */
```

SimpleLogger.#### debug()

Logs in the debug level. Use this to help find bugs or understand the code flow.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

#### SimpleLogger.info()

Logs in the information level. Use this to inform about important things in your flow.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

#### SimpleLogger.warn()

Logs in the warning level. Use this to warn that something unexpected happened in the flow.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

#### SimpleLogger.error()

Logs in the error level. Use this to inform that an error occourred in the flow.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

### ContextLogger

Enables logging in different contexts and makes it possible to store debug logs in a stream that will be dumped if some error occours.

```js
/**
 * @param {LoggerSetup} setup - Logger's configuration.
 * @param {LogStreamContextManager} logContextManager - Used to manage context information for the logs.
 * @param {boolean} enableLogStreams - When true enables debug logs to be stored and dumped if some error occours. Defaults to true
 */
```

#### ContextLogger.createLogStream()

Creates a log stream for the current logging context. Use this to create a stream dedicated to store logs in a specific context.

```js
/** 
 * @return {void}
 */
```

#### ContextLogger.deleteLogStream()

Deletes the log stream for the current logging context.

> It is very important to exclude your log stream when your flow ends, otherwise your memory may be in trouble.

```js
/** 
 * @return {void}
 */
```

#### ContextLogger.debug()

Stores log registers in the current context's stream. It logs in the debug level when the `enableLogStreams` param is `false`.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

#### ContextLogger.info()

Logs in the information level. Use this to inform about important things in your flow.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

#### ContextLogger.warn()

Logs in the warning level. Use this to warn that something unexpected happened in the flow.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```

#### ContextLogger.error()

Logs the error that occourred and then dumps all information in the current context's log stream. It only logs in the error level if the `enableLogStreams` param is `false`.

```js
/** 
 * @param {Info} info - The information you want to go inside the log.
 * @return {void}
 */
```
