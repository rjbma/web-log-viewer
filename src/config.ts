import { Command } from 'commander'
import { extractIndexTokens as extractIndexTokensFn } from './log-index'

const program = new Command('json-log-viewer')
program.version('0.0.1')
program.option(
  '-p, --parser <filename>',
  'specify the script used for parsing lines of text from stdin and converting them to JSON',
)
program.option(
  '-k, --index-keys',
  'allow searching by the log object keys, instead of just their value. Disabled by default',
  false,
)

program.parse(process.argv)
const options = program.opts()

const parseRawMessage = options.parser ? require(options.parser) : require('./defaultMessageParser')
const extractIndexTokens = extractIndexTokensFn({ includeObjectKeys: options.indexKeys })

export { parseRawMessage, extractIndexTokens }
