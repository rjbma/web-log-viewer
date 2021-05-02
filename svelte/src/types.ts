type OperationMode = 'static' | 'tail'

/**A log message has sent by the server to the clients */
type LogMessage = {
  seq: number
  data: Record<string, any>
  index: string[]
}

/**A log message that's already been formatted and ready to be displayed */
type FormattedMessage = {
  seq: number
  rawMessage: Record<string, any>
  formattedMessage: Record<string, any>
}

/**A function that formats a log message */
type LogFormatter = Record<string, LogColumnFormatter>
type LogColumnFormatter = (message: LogMessage['data'], seq: number) => any

// ***
// SERVER MESSAGES
// ***

// the message sent to clients that either just connected or changed operation model (tail <-> static)
type InitMessage =
  | {
      type: 'init'
      mode: 'tail'
      /**Total number of messages in the server  */
      totalSize: number
      window: {
        /**
         * Number of messages of a specific client, after applying filters defined on the client.
         * Less than or equal to `totalSize`
         */
        size: number
        /**Maximum number of messages that should be sent to the client */
        maxMessages: number
        /**
         * Messages sent to the client. A subset of the filtered messages for this client.
         */
        messages: LogMessage[]
      }
    }
  | {
      type: 'init'
      mode: 'static'
      /**Total number of messages in the server  */
      totalSize: number
      window: {
        /**
         * Number of messages of a specific client, after applying filters defined on the client.
         * Less than or equal to `totalSize`
         */
        size: number
        /**Maximum number of messages that should be sent to the client */
        maxMessages: number
        /** Index of the first message included */
        offsetStart: number
        /**
         * Messages sent to the client. A subset of the filtered messages for this client.
         */
        messages: LogMessage[]
      }
    }
// the message sent to all clients once a new message comes in from stdin
type UpdateMessage = { type: 'update'; size: number; message: LogMessage }
// all messages in the direction Server -> Client
type ServerMessage = InitMessage | UpdateMessage

// CLIENT MESSAGES
type StaticClientMessage = {
  mode: 'static'
  filter: string
  offsetStart: number
  /**Maximum number of messages that should be sent to the client */
  maxMessages: number
}
type TailClientMessage = {
  mode: 'tail'
  filter: string
  /**Maximum number of messages that should be sent to the client */
  maxMessages: number
}
/**Messages sent from the client to the server, basically to signal it want to swith operation mode */
type ClientMessage = StaticClientMessage | TailClientMessage

export type {
  LogMessage,
  FormattedMessage,
  LogFormatter,
  LogColumnFormatter,
  ServerMessage,
  ClientMessage,
}
