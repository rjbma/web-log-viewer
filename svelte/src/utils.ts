import AnsiUp from 'ansi_up'

const ansiUp = new AnsiUp()

/**
 * Convert ANSI escape codes (see https://en.wikipedia.org/wiki/ANSI_escape_code) to HTML (mostly for colors).
 *
 * Uses https://github.com/drudru/ansi_up
 */
function unescape(str: string | undefined) {
  if (!str) {
    return str
  } else if (typeof str !== 'string') {
    return str
  } else {
    // if JSON.stringiy is used to format the data, \x1b will be replaced the its unicode equivalent, \u001b
    // which is not supported by `ansi_up`. So, we turn it back to \x1b again here
    const withAsciiEscapes = str.replace(/\\u001b/g, '\x1b')
    return ansiUp.ansi_to_html(withAsciiEscapes || '')
  }
}

export { unescape }
