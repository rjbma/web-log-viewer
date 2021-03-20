import { Command } from 'commander'

const program = new Command('json-log-viewer')
program.version('0.0.1')
program.option(
  '-p, --parser <filename>',
  'specify the script used for parsing lines of text from stdin and converting them to JSON',
)

program.parse(process.argv)
const options = program.opts()

const parseRawMessage = options.parser ? require(options.parser) : require('./defaultMessageParser')

export { parseRawMessage }
