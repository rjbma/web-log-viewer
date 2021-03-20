const json5 = require('json5')
/**
 * Default parser implementation, that transforms a string (usually a single
 * line of text coming in from **stdin**) into a JSON object containing the data
 * present in a log message
 */

module.exports = (rawMessage) => {
  try {
    const msg = json5.parse(rawMessage)
    if (msg.message && msg.message.request && msg.message.request.headers) {
      msg.message.request.headers = json5.parse(msg.message.request.headers)
    }
    if (msg.message && msg.message.request && msg.message.request.body) {
      msg.message.request.body = json5.parse(msg.message.request.body)
    }
    if (msg.message && msg.message.response && msg.message.response.headers) {
      msg.message.response.headers = json5.parse(msg.message.response.headers)
    }
    if (msg.message && msg.message.response && msg.message.response.body) {
      msg.message.response.body = json5.parse(msg.message.response.body)
    }
    return msg
  } catch (err) {
    const msg = { message: rawMessage }
    return msg
  }
}
