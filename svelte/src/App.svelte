<script lang="ts">
  import { logStore } from './log-store'
  import LogMessageDetails from './LogMessageDetails.svelte'
  import type { FormattedMessage, LogMessage } from './types'

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

  function onScroll(ev: Event) {
    const el = ev.target as Element
    if (isScrolledToBottom(el)) {
      if ($logStore.mode == 'static') {
        logStore.changeToTail()
      }
    } else {
      logStore.changeToStatic(calcSeqByOffset(el.scrollTop, $logStore.count))
    }
  }

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
  {#if logMessageBeingViewed}
    <LogMessageDetails
      logMessage={logMessageBeingViewed}
      logSize={$logStore.count}
      on:close={() => (logMessageBeingViewed = undefined)}
      on:viewPrevious={() => viewRelativeLog(-1)}
      on:viewNext={() => viewRelativeLog(1)}
    />
  {/if}

  <p>
    Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte
    apps.
  </p>
  <h1>Log <small>{$logStore.count} items</small></h1>
  <label><input type="checkbox" checked={$logStore.mode == 'tail'} disabled />Follow log?</label>
  <section id="windowLogs" class="windowLogs" on:scroll={onScroll}>
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
              ><button type="button" on:click={() => (logMessageBeingViewed = msg)}>View</button
              ></td
            >
            {#each $logStore.columns as col (col)}
              <td>{msg.formattedMessage[col]}</td>
            {/each}
          </tr>
        {/each}
        <tr
          class="windowLogs-beforeWindowRow"
          style="height: {calcAfterWindowRowHeight($logStore.window, $logStore.count)}px"
        />
      </tbody>
    </table>
  </section>
</main>

<style>
  .windowLogs {
    height: 500px;
    overflow: auto;
    margin: auto;
  }

  .windowLogs-table {
    table-layout: fixed;
    white-space: nowrap;
    text-align: left;
    border-collapse: collapse;
    position: relative;
    width: 100%;
  }
  .windowLogs-table tbody tr {
    height: 20px;
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
    background-color: white;
    padding: 20px 7px;
  }
  .windowLogs-table td {
    border-top: 1px dashed #dedede;
  }

  main {
    text-align: center;
    padding: 1em 1em;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
</style>
