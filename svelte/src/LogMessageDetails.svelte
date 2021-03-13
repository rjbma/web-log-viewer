<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { FormattedMessage } from './types'

  export let logMessage: FormattedMessage
  export let logSize: number

  const dispatch = createEventDispatcher()
  const closeDialog = () => dispatch('close')
  $: isFirst = logMessage.seq == 1
  $: isLast = logMessage.seq == logSize
</script>

<main class="logMessageDetails">
  <div class="logMessageDetails-backdrop" on:click={closeDialog} />
  <div class="logMessageDetails-actions">
    <button on:click={closeDialog}>Close</button>
    <button disabled={isFirst} on:click={() => dispatch('viewPrevious')}>Prev</button>
    <button disabled={isLast} on:click={() => dispatch('viewNext')}>Next</button>
  </div>
  <div class="logMessageDetails-value">
    {JSON.stringify(logMessage.rawMessage, null, 2)}
  </div>
</main>

<style>
  .logMessageDetails {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
  }
  .logMessageDetails-backdrop {
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: #00000066;
  }
  .logMessageDetails-actions {
    position: relative;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  .logMessageDetails-value {
    white-space: pre;
    font-family: monospace;
    line-height: 1.2rem;
    text-align: left;
    background-color: white;
    position: relative;
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 20px;
    padding: 20px 30px;
    border-radius: 10px;
    box-shadow: 0px 2px 5px 0px #444;
    max-height: calc(100% - 40px);
    overflow: auto;
  }
  .logMessageDetails-actions {
    position: relative;
  }
</style>
