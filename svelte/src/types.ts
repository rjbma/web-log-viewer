type OperationMode = 'static' | 'tail'

/**A log message has sent by the server to the clients */
type LogMessage = Record<string, any> & { __seq: number }

/**A log message that's already been formatted and ready to be displayed */
type FormattedMessage = Record<string, any>

/**A function that formats a log message */
type LogFormatter = (message: LogMessage) => Record<string, any>

// ***
// SERVER MESSAGES
// ***

// the message sent to clients that either just connected or changed operation model (tail <-> static)
type InitMessage = {
  type: 'init'
  mode: OperationMode
  size: number
  window: LogMessage[]
}
// the message sent to all clients once a new message comes in from stdin
type UpdateMessage = { type: 'update'; size: number; message: LogMessage }
// all messages in the direction Server -> Client
type ServerMessage = InitMessage | UpdateMessage

// CLIENT MESSAGES
type StaticClientMessage = { mode: 'static'; offsetSeq: number }
type TailClientMessage = { mode: 'tail' }
/**Messages sent from the client to the server, basically to signal it want to swith operation mode */
type ClientMessage = StaticClientMessage | TailClientMessage

export type { LogMessage, FormattedMessage, LogFormatter, ServerMessage, ClientMessage }
