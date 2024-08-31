import { LogStore, useLogViewerMachine } from './wlv.machine'
import './App.css'
import { unescape } from './utils'
import React from 'react'
import { throttle } from 'lodash'

const ROW_HEIGHT = 30

function App() {
  const { state, transitions } = useLogViewerMachine()
  const logMessageBeingViewed = false

  React.useEffect(() => {
    if (state.status == 'Ready' && state.mode == 'tail') {
      scrollToBottom()
    }
  })

  if (state.status == 'Initializing' || state.status == 'Disconnected') {
    return <>{state.status}</>
  } else {
    return (
      <main>
        <h1>
          Web log viewer
          <small>
            <strong>{state.count}</strong> messages
          </small>
          {state.mode == 'tail' && (
            <small>
              in <strong>follow</strong> mode
            </small>
          )}
          {state.mode == 'static' && (
            <small>
              <strong>frozen</strong> at {state.window[0]?.seq}{' '}
            </small>
          )}
        </h1>

        <section className="logFilters">
          <input
            className="windowLogs-filterInput"
            type="text"
            placeholder="enter text to filter messages"
            tabIndex={logMessageBeingViewed ? -1 : 0}
            // TODO
            // TODO
            // TODO
            // TODO
            // on:keyup={onChangeFilter}
          />
        </section>
        <section
          id="windowLogs"
          className="windowLogs"
          onScroll={throttle(
            ev => {
              ev.target && transitions.scroll(state, { element: ev.target as Element })
            },
            100,
            { leading: false, trailing: true },
          )}
        >
          {state.count == 0 && <div className="message message--info">No messages found</div>}
          {state.count > 0 && (
            <table className="windowLogs-table">
              <thead>
                <tr style={{ height: `${ROW_HEIGHT}px` }}>
                  <th />
                  {state.columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr
                  className="windowLogs-beforeWindowRow"
                  style={{ height: `${calcBeforeWindowRowHeigh(state)}px` }}
                />
                {state.window.map(msg => (
                  <tr
                    key={msg.seq}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={
                      // TODO
                      // TODO
                      // TODO
                      // TODO
                      // logMessageBeingViewed?.seq == msg.seq ? 'windowLogs-selectedRow' : ''
                      ''
                    }
                  >
                    <td className="windowLogs-viewLogMessageButton">
                      <button
                        tabIndex={logMessageBeingViewed ? -1 : 0}
                        className="button button--small"
                        type="button"
                        // TODO
                        // TODO
                        // TODO
                        // logMessageBeingViewed?.seq == msg.seq ? 'windowLogs-selectedRow' : ''
                        // onClick={() => (logMessageBeingViewed = msg)}
                      >
                        View
                      </button>
                    </td>
                    {state.columns.map(col => (
                      <td
                        key={col}
                        dangerouslySetInnerHTML={{
                          __html: unescape(msg.formattedMessage[col]) || '',
                        }}
                      ></td>
                    ))}
                  </tr>
                ))}

                <tr
                  className="windowLogs-afterWindowRow"
                  style={{ height: `${calcAfterWindowRowHeight(state)}px` }}
                />
              </tbody>
            </table>
          )}
        </section>
      </main>
    )
  }
}

function calcBeforeWindowRowHeigh(logStore: LogStore) {
  if (logStore.mode == 'tail') {
    return Math.max(logStore.count - logStore.maxMessages, 0) * ROW_HEIGHT
  } else if (logStore.mode == 'static') {
    return Math.max(logStore.offsetStart, 0) * ROW_HEIGHT
  }
}

function calcAfterWindowRowHeight(logStore: LogStore) {
  if (logStore.mode == 'tail') {
    return 0
  } else if (logStore.mode == 'static') {
    const offsetEnd = Math.min(logStore.offsetStart + logStore.maxMessages, logStore.count)
    return Math.max(logStore.count - offsetEnd, 0) * ROW_HEIGHT
  }
}

function scrollToBottom() {
  const element = document.getElementById('windowLogs')
  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

export default App
