<script lang="ts">
  import { logStore } from './log-store'
  import LogMessageDetails from './LogMessageDetails.svelte'
  import type { FormattedMessage, LogMessage } from './types'
  import debounce from 'lodash/debounce'

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

  // TODO can be memoized
  function calcBeforeWindowRowHeigh(logWindow: FormattedMessage[]) {
    if (!logWindow || !logWindow.length) {
      return 0
    } else {
      return (logWindow[0].seq - 1) * ROW_HEIGHT
    }
  }

  // TODO can be memoized
  function calcAfterWindowRowHeight(logWindow: FormattedMessage[], logCount: number) {
    if (!logWindow || !logWindow.length) {
      return 0
    } else {
      const lastSeqInWindow = logWindow[logWindow.length - 1].seq
      return (logCount - lastSeqInWindow) * ROW_HEIGHT
    }
  }

  const isScrolledToBottom = (el: Element) => el.scrollHeight - el.scrollTop - el.clientHeight < 1

  const calcSeqByOffset = (offset: number, logCount: number) => Math.floor(offset / ROW_HEIGHT)

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
        const seq = calcSeqByOffset(el.scrollTop, $logStore.count) + 1
        logStore.changeToStatic(seq)
      }
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
    if (currentIndex == -1) {
      logMessageBeingViewed = undefined
    } else {
      logMessageBeingViewed = $logStore.window[currentIndex + delta]
    }
  }
</script>

<main>
  <!-- show a modal with details on the currently selected message -->
  {#if logMessageBeingViewed}
    <LogMessageDetails
      logMessage={logMessageBeingViewed}
      logSize={$logStore.count}
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
      <small>frozen at offset <strong>{$logStore.offsetSeq}</strong></small>
    {/if}
  </h1>

  <section class="logFilters">
    <input
      class="windowLogs-filterInput"
      type="text"
      placeholder="enter text to filter messages"
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
            style="height: {calcBeforeWindowRowHeigh($logStore.window)}px"
          />
          {#each $logStore.window as msg (msg.seq)}
            <tr style="height: {ROW_HEIGHT}px">
              <td class="windowLogs-viewLogMessageButton"
                ><button
                  class="button button--small"
                  type="button"
                  on:click={() => (logMessageBeingViewed = msg)}>View</button
                ></td
              >
              {#each $logStore.columns as col (col)}
                <td>{msg.formattedMessage[col] || ''}</td>
              {/each}
            </tr>
          {/each}
          <tr
            class="windowLogs-afterWindowRow"
            style="height: {calcAfterWindowRowHeight($logStore.window, $logStore.count)}px"
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
  .windowLogs-table tr:hover td {
    background-color: var(--gray-100);
  }
  .windowLogs-table td {
    border-top: 1px solid var(--gray-200);
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
