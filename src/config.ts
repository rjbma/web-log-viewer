import { Command } from 'commander'
import { extractIndexTokens as extractIndexTokensFn } from './log-index'

const program = new Command('web-log-viewer')
program.version('0.0.1')
program.option('--port <port>', 'specify the port where the server will run', '8000')
program.option(
  '-p, --parser <filename>',
  'specify the script used for parsing lines of text from stdin and converting them to JSON. Defaults to parse using `json5` (https://www.npmjs.com/package/json5)',
)
program.option(
  '-k, --index-keys',
  'allow searching by the log object keys, instead of just its values',
  false,
)
program.option('-s, --stdout', 'log every message coming in to stdout', false)

program.parse(process.argv)
const options = program.opts()

const config = {
  port: options.port || 8000,
  stdout: options.stdout || false,
  parseRawMessage: options.parser ? require(options.parser) : require('./defaultMessageParser'),
  extractIndexTokens: extractIndexTokensFn({ includeObjectKeys: options.indexKeys }),
}

export { config }
