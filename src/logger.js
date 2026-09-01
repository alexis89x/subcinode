/**
 * Tiny leveled logger. Higher `currentLevel` prints more.
 * The numeric scale is kept from the original tool for backwards compatibility.
 */
export const logLevels = {
  DEBUG: 60,
  INFO: 50,
  WARNING: 40,
  ERROR: 30,
  FATAL: 20,
  ALL: 10
};

let currentLevel = logLevels.INFO;

/**
 * @param {number} level one of {@link logLevels}
 */
export function setLevel(level) {
  currentLevel = level;
}

/**
 * Sets the level from parsed CLI options: `--debug` raises it to DEBUG, otherwise INFO.
 * @param {{ debug?: boolean }} options
 */
export function setLevelFromOptions(options) {
  setLevel(options && options.debug ? logLevels.DEBUG : logLevels.INFO);
}

export function getLevel() {
  return currentLevel;
}

/**
 * Logs `message` when the current level is verbose enough for `level`.
 * @param {*} message
 * @param {number} [level=logLevels.DEBUG]
 */
export function log(message, level = logLevels.DEBUG) {
  if (currentLevel >= level) {
    console.log(message);
  }
}

export const logger = {
  logLevels,
  setLevel,
  setLevelFromOptions,
  getLevel,
  log
};

export default logger;
