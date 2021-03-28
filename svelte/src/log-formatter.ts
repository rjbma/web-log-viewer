const FORMATTER = 'jsl.formatter'

const DEFAULT_LOG_FORMATTER = `
  ({
    '#': (l, seq) => seq,
    message: l => JSON.stringify(l),
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
