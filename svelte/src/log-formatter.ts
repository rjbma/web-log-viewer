interface FormatterConfig {
  collapseConfig: boolean
  fn: string
}

const FORMATTER_KEY = 'jsl.formatter'

const DEFAULT_LOG_FORMATTER: FormatterConfig = {
  collapseConfig: false,
  fn: `const parseDate = (s) => new Date(s).toISOString();

({
  '#': (msg, seq) => seq,
  timestamp: msg => parseDate(msg.timestamp),
  message: msg => JSON.stringify(msg),
})
`,
}

const formatter = {
  updateFormatter: (formatter: FormatterConfig) => {
    const newFormatter = JSON.stringify(formatter)
    sessionStorage.setItem(FORMATTER_KEY, newFormatter)
    localStorage.setItem(FORMATTER_KEY, newFormatter)
    return formatter
  },

  updateFormatterFn: (newFormatterFn: string) => {
    const cfg = formatter.getFormatter()
    cfg.fn = newFormatterFn
    return formatter.updateFormatter(cfg)
  },

  toggleFormatterConfig: () => {
    const cfg = formatter.getFormatter()
    cfg.collapseConfig = !cfg.collapseConfig
    return formatter.updateFormatter(cfg)
  },

  getFormatter: (): FormatterConfig => {
    try {
      const fromStorage =
        sessionStorage.getItem(FORMATTER_KEY) || localStorage.getItem(FORMATTER_KEY)
      return fromStorage ? JSON.parse(fromStorage) : DEFAULT_LOG_FORMATTER
    } catch (err) {
      console.error('Found invalid formatter on storage, reverting to default.')
      return DEFAULT_LOG_FORMATTER
    }
  },

  resetFormatter: () => {
    sessionStorage.removeItem(FORMATTER_KEY)
    localStorage.removeItem(FORMATTER_KEY)
    return DEFAULT_LOG_FORMATTER
  },
}

export { formatter }
export type { FormatterConfig }
