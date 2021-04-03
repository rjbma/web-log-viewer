const FORMATTER = 'jsl.formatter'

const DEFAULT_LOG_FORMATTER = `const parseDate = (s) => new Date(s).toISOString();

({
  '#': (msg, seq) => seq,
  timestamp: msg => parseDate(msg.timestamp),
  message: msg => JSON.stringify(msg),
})
`

const formatter = {
  updateFormatter: (newFormatter: string) => {
    sessionStorage.setItem(FORMATTER, newFormatter)
    localStorage.setItem(FORMATTER, newFormatter)
  },
  getFormatter: () =>
    sessionStorage.getItem(FORMATTER) || localStorage.getItem(FORMATTER) || DEFAULT_LOG_FORMATTER,

  resetFormatter: () => {
    sessionStorage.removeItem(FORMATTER)
    localStorage.removeItem(FORMATTER)
    return DEFAULT_LOG_FORMATTER
  },
}

export { formatter }
