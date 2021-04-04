A web based log viewer
# Installation

    npm install --global web-log-viewer

# How it works

In the server component:

1. reads one line of text from `stdin`
2. transforms the line of text into JSON using a **parser**
3. sends that JSON data to the web client via **websocket**

In the web client:

4. transforms the received JSON data into another JSON structure using a **formatter**
5. displays the formatted data in an HTML table
6. allow the user to see the full contents of the *parsed* message

# Usage
Display the contents of a file. Use the default parser, which parses each line of text with [json5](https://www.npmjs.com/package/json5)
```
    cat file.log | web-log-viewer
```
Then go to http://localhost:8000. You can use `tail` instead of `cat` to follow changes made to the file.


Pipe the `stdout` of a command. Use a custom parser to transform lines of text to JSON. 

    cmd.sh | web-log-viewer --parser my-custom-parser.js --port 8080

Then go to http://localhost:8080

# Parser
The parser runs in the server component, and transform a single line of text into a JSON object that will be sent to the web client. For example, a parser could be used to transform logs produced by **log4j** into JSON.

The default parser simply tries to parse data with **json5**:

```typescript
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
```

# Formatter
Formatters run in the web client; their purpose is to select which fields of the JSON object should be displayed by the web client. Note that a single server can have several web clients (i.e., browser tabs), each with their own formatter.

A formatter consists of an object, where each field consists of a function. Each function is executed with the JSON object sent by the server component, and must return the value that will be displayed to the user.

For example, the following formatter will display three fields:

```javascript
const formatDate = d => new Date(d).toISOString();

({
    '#': (log, seq) => seq,
    message: log => log.message,
    level: log => log.meta.logLevel,
    time: log => formatDate(log.timestamp),
})`
```

Errors that occur in these formatter functions are ignored, and the return will return empty string instead.

**NOTE**: this uses `eval`!

# TODO (or, stuff that will never get done)
- should accept a transformer function that maps a single line from `stdin` into a list of `RawMessage`s. Some examples would be:
    - 1:1 mapping (the default) would not do any transformations. For when we have a log file with JSON (or JSON5) format
    - 1:1 mapping, transforming a textual (e.g., `log4j`) log file into JSON
    - 1:n mapping, transforming a JSON file, wich potentially included lots of information in arrays, into a list of `RawMessage`s
- the client (svelte) should display the status of the connection with the server
- the client (svelte) should be able to restore the connection with the server when it is available again
- security when accessing the logs?
- grouping rows (e.g., group all messages belonging to the same request)
- filtering by timestamp
- log line color
- possibility to return a primary and secondary value for each column; return a color/css; return a width for the column
- use https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Language_Bindings/Components.utils.Sandbox? 
