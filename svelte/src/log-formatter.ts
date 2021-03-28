const FORMATTER = 'jsl.formatter'

const DEFAULT_LOG_FORMATTER = `
  ({
    '#': (l, seq) => seq,
    level: l => l.level,
    timestamp: l => l.timestamp.substring(0, 19).replace('T', ' '),
    message: l => l.message,
  })`

const formatter = {
  updateFormatter: (newFormatter: string) => {
    localStorage.setItem(FORMATTER, newFormatter)
  },
  getFormatter: () => {
    return localStorage.getItem(FORMATTER) || DEFAULT_LOG_FORMATTER
  },
  resetFormatter: () => {
    localStorage.removeItem(FORMATTER)
  },
}

export { formatter }
