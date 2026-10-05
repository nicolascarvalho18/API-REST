const levels = { error: 0, warn: 1, info: 2, debug: 3, silent: -1 };
const threshold = levels[process.env.LOG_LEVEL] ?? 2;

export const logger = Object.fromEntries(
  ["error", "warn", "info", "debug"].map((level) => [
    level,
    (message, context = {}) => {
      if (threshold >= levels[level])
        console[level === "debug" ? "log" : level](
          JSON.stringify({
            level,
            message,
            ...context,
            timestamp: new Date().toISOString(),
          }),
        );
    },
  ]),
);
