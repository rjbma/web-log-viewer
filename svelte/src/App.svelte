<script lang="ts">
  import { logStore } from './log-store'
  import type { LogStore } from './log-store'
  import LogMessageDetails from './LogMessageDetails.svelte'
  import type { FormattedMessage, LogMessage } from './types'
  import debounce from 'lodash/debounce'
  import { unescape } from './utils'

  // height of each row, in pixels
  const ROW_HEIGHT = 30

  let logMessageBeingViewed: FormattedMessage

  // scroll to bottom when new logs come in while on tail mode
  logStore.subscribe(logs => {
    if (logs.mode == 'tail') {
      setTimeout(() => scrollToBottom(), 0)
    }
  })

  function scrollToBottom() {
    const element = document.getElementById('windowLogs')
    if (element) {
      element.scrollTop = element.scrollHeight
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

  const isScrolledToBottom = (el: Element) =>
    Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10

  /**
   * Calculate the seq the user has offset to, and requet data from the server around that offset.
   */
  const onScroll = debounce(
    (ev: Event) => {
      const el = ev.target as Element
      if (isScrolledToBottom(el)) {
        if ($logStore.mode == 'static') {
          logStore.changeToTail()
        }
      } else {
        const percStart = el.scrollTop / el.scrollHeight
        const offsetStart = Math.floor(percStart * $logStore.count)
        logStore.changeToStatic(offsetStart)
      }
    },
    100,
    { leading: false, trailing: true },
  )

  const onResize = debounce(
    (ev: Event) => {
      const visibleHeight = document.getElementById('windowLogs').clientHeight
      logStore.resizeWindow(visibleHeight, ROW_HEIGHT)
    },
    100,
    { leading: false, trailing: true },
  )

  /**
   * Called when the user enters a new filter query. This will eventually
   * fetch filtered data from the server
   */
  const onChangeFilter = debounce(
    (ev: Event) => {
      const input = ev.target as HTMLInputElement
      logStore.changeFilter(input.value)
    },
    100,
    { leading: false, trailing: true },
  )

  function viewRelativeLog(delta: 1 | -1) {
    const currentIndex = $logStore.window.findIndex(l => l === logMessageBeingViewed)
    const newLogMessageBeingViewed = $logStore.window[currentIndex + delta]
    if (newLogMessageBeingViewed) {
      logMessageBeingViewed = newLogMessageBeingViewed
    }
  }
</script>

<svelte:window on:resize={onResize} />
<main>
  <!-- show a modal with details on the currently selected message -->
  {#if logMessageBeingViewed}
    <LogMessageDetails
      logMessage={logMessageBeingViewed}
      firstInWindowSeq={$logStore.window[0]?.seq}
      lastInWindowSeq={$logStore.window[$logStore.window.length - 1]?.seq}
      formatter={$logStore.formatter}
      on:viewPrevious={() => viewRelativeLog(-1)}
      on:viewNext={() => viewRelativeLog(1)}
      on:closeAndUpdateFormatter={e => {
        if (e.detail?.newFormatter) {
          // check if formatter has actually changed
          if ($logStore.formatter != e.detail.newFormatter) {
            logStore.changeFormatter(e.detail.newFormatter)
          }
        }
        logMessageBeingViewed = undefined
      }}
    />
  {/if}

  <h1>
    Web log viewer
    <small><strong>{$logStore.count}</strong> messages</small>
    {#if $logStore.mode == 'tail'}
      <small>in <strong>follow</strong> mode</small>
    {/if}
    {#if $logStore.mode == 'static'}
      <small><strong>frozen</strong> at {$logStore.window[0]?.seq} </small>
    {/if}
  </h1>

  <section class="logFilters">
    <input
      class="windowLogs-filterInput"
      type="text"
      placeholder="enter text to filter messages"
      tabindex={logMessageBeingViewed ? -1 : 0}
      on:keyup={onChangeFilter}
    />
  </section>

  <section id="windowLogs" class="windowLogs" on:scroll={onScroll}>
    {#if $logStore.window.length == 0}
      <div class="message message--info">No messages found</div>
    {:else}
      <table class="windowLogs-table">
        <thead>
          <tr style="height: {ROW_HEIGHT}px">
            <th />
            {#each $logStore.columns as col}
              <th>{col}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          <tr
            class="windowLogs-beforeWindowRow"
            style="height: {calcBeforeWindowRowHeigh($logStore)}px"
          />
          {#each $logStore.window as msg (msg.seq)}
            <tr
              style="height: {ROW_HEIGHT}px"
              class={logMessageBeingViewed?.seq == msg.seq ? 'windowLogs-selectedRow' : ''}
            >
              <td class="windowLogs-viewLogMessageButton"
                ><button
                  tabindex={logMessageBeingViewed ? -1 : 0}
                  class="button button--small"
                  type="button"
                  on:click={() => (logMessageBeingViewed = msg)}>View</button
                ></td
              >
              {#each $logStore.columns as col (col)}
                <td>{@html unescape(msg.formattedMessage[col])}</td>
              {/each}
            </tr>
          {/each}
          <tr
            class="windowLogs-afterWindowRow"
            style="height: {calcAfterWindowRowHeight($logStore)}px"
          />
        </tbody>
      </table>
    {/if}
  </section>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .windowLogs {
    height: 100%;
    overflow: auto;
  }

  .windowLogs-filterInput {
    border-radius: 5px;
    font-size: 20px;
    padding: 20px;
    width: 100%;
    max-width: 900px;
    margin: 0px 0px 25px 0px;
  }

  .windowLogs-table {
    table-layout: auto;
    white-space: nowrap;
    text-align: left;
    border-collapse: separate;
    border-spacing: 0;
    position: relative;
    width: 100%;
    font-size: 14px;
  }
  .windowLogs-table td,
  .windowLogs-table th {
    padding: 2px 7px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .windowLogs-table td {
    font-family: monospace;
  }
  .windowLogs-table th {
    position: sticky;
    top: 0px;
    background-color: var(--gray-100);
    padding: 10px 7px;
    border-top: 1px solid var(--gray-200);
    border-bottom: 1px solid var(--gray-200);
    color: var(--primary-color);
    font-weight: 500;
    letter-spacing: 0.9px;
    font-size: 16px;
  }
  .windowLogs-table th:first-child {
    border-top-left-radius: 5px;
    border-left: 1px solid var(--gray-200);
  }
  .windowLogs-table th:last-child {
    border-top-right-radius: 5px;
    border-right: 1px solid var(--gray-200);
  }
  .windowLogs-table tr.windowLogs-selectedRow td,
  .windowLogs-table tr:hover td {
    background-color: rgba(111, 161, 87, 0.15);
  }
  .windowLogs-table td {
    border-top: 1px solid var(--gray-100);
  }
  .windowLogs-table td:first-child {
    border-left: 1px solid var(--gray-200);
  }
  .windowLogs-table td:last-child {
    border-right: 1px solid var(--gray-200);
  }

  main {
    padding: 1em 1em;
    margin: 0 auto;
  }

  h1 {
    text-align: left;
    color: var(--primary-color);
    text-transform: uppercase;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 5px;
    margin-top: 0px;
  }
  h1 small {
    text-transform: lowercase;
    font-size: 20px;
    letter-spacing: normal;
    font-weight: normal;
    color: var(--gray-600);
  }
  h1 small:not(:last-child)::after {
    content: '·';
    margin-left: 10px;
    margin-right: -5px;
  }

  .message {
    border: 1px solid;
    border-radius: 5px;
    padding: 20px;
    margin: 20px 0px;
    border-color: var(--gray-600);
    color: var(--gray-600);
    background-color: var(--gray-100);
  }
  .message--info {
    text-align: center;
    border-color: #0c5460;
    color: #0c5460;
    background-color: #0c546022;
  }
</style>
