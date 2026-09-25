const writeLog = (level, event, details = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    severity: level,
    event,
    ...details,
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

module.exports = {
  info: (event, details) => writeLog("info", event, details),
  warn: (event, details) => writeLog("warn", event, details),
  error: (event, details) => writeLog("error", event, details),
};
