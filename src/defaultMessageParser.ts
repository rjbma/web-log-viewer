import json5 from 'json5'

/**
 * Default parser implementation, that transforms a string (usually a single
 * line of text coming in from **stdin**) into a JSON object containing the data
 * present in a log message
 */

module.exports = (rawMessage: string) => {
  try {
    return json5.parse(rawMessage)
  } catch (err) {
    const msg = { message: rawMessage }
    return msg
  }
}
