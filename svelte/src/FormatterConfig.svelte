<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { LogFormatter } from './types'

  export let formatter: string

  const dispatch = createEventDispatcher()
  const saveChanges = () => dispatch('close', { newFormatter: formatter })
  const cancelChanges = () => dispatch('close')
</script>

<main class="formatterConfig">
  <div class="formatterConfig-backdrop" on:click={saveChanges} />
  <div class="logMessageDetails-actions">
    <button on:click={saveChanges}>Apply</button>
    <button on:click={cancelChanges}>Cancel</button>
  </div>
  <textarea class="formatterConfig-value" bind:value={formatter} />
</main>

<style>
  .formatterConfig {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
  }
  .formatterConfig-backdrop {
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: #00000066;
  }
  .formatterConfig-value {
    white-space: pre;
    font-family: monospace;
    line-height: 1.2rem;
    text-align: left;
    background-color: white;
    position: relative;
    width: 900px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 20px;
    padding: 20px 30px;
    border-radius: 10px;
    box-shadow: 0px 2px 5px 0px #444;
    height: calc(100% - 60px);
    overflow: auto;
  }
  .logMessageDetails-actions {
    position: relative;
  }
</style>
