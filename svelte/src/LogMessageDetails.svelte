<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { formatLogMessage, logStore, parseFormatter } from './log-store'
  import json5 from 'json5'
  import type { FormattedMessage } from './types'
  import ace from 'brace'
  import 'brace/mode/javascript'
  import 'brace/keybinding/vim'
  import type { FormatterConfig } from './log-formatter'
  import { stripAnsiEscapes } from './utils'

  export let logMessage: FormattedMessage
  export let firstInWindowSeq: number
  export let lastInWindowSeq: number
  export let formatter: FormatterConfig

  const dispatch = createEventDispatcher()
  const closeDialog = () => dispatch('closeAndUpdateFormatter', { newFormatterFn: formatter.fn })
  const formatObject = (obj: any, type: 'json' | 'json5') => {
    if (typeof obj == 'string') {
      return obj
    } else if (type == 'json5') {
      return stripAnsiEscapes(json5.stringify(obj, null, 2))
    } else {
      return stripAnsiEscapes(JSON.stringify(obj, null, 2))
    }
  }
  const resetFormatter = () => {
    logStore.resetFormatter()
  }

  // keep track of whether the first/last message is being displayed
  $: isFirst = logMessage.seq == firstInWindowSeq
  $: isLast = logMessage.seq == lastInWindowSeq
  // keep the format example updated
  $: formattedExample = (() => {
    try {
      const msg = {
        seq: logMessage.seq,
        data: logMessage.rawMessage,
        index: [],
      }
      return formatLogMessage(formatter.fn)(msg)
    } catch (err) {
      return { formattedMessage: err.message }
    }
  })()
  // whenever the formatter changes, update the ace editor
  $: {
    if (editor && formatter.fn !== editor.getValue()) {
      editor.setValue(formatter.fn, 1)
    }
  }

  let keybinding: 'vim' | 'normal' = 'vim'
  let editor: ace.Editor
  let viewer: ace.Editor
  onMount(() => {
    viewer = ace.edit('viewer')
    viewer.setReadOnly(true)
    viewer.getSession().setMode('ace/mode/javascript')
    viewer.setValue(formatObject(logMessage.rawMessage, 'json'), 1)

    editor = ace.edit('editor')
    editor.getSession().setMode('ace/mode/javascript')
    editor.setValue(formatter.fn, 1)
    editor.addEventListener('change', (e, editor) => {
      formatter = { ...formatter, fn: editor.getValue() }
    })
  })
  $: {
    editor && editor.setKeyboardHandler(keybinding == 'vim' ? 'ace/keyboard/vim' : '')
  }
</script>

<main class="logMessageDetails">
  <div class="logMessageDetails-backdrop" on:click={closeDialog} />
  <div class="logMessageDetails-container">
    <!-- show the log message details, allow navigating to adjacent logs -->
    <div class="logMessageDetails-actions">
      <button class="button button--primary logMessageDetails-closeButton" on:click={closeDialog}
        >Close</button
      >
      <button
        class="button logMessageDetails-prevButton"
        disabled={isFirst}
        on:click={() => dispatch('viewPrevious')}>Prev</button
      >
      <button
        class="button logMessageDetails-nextButton"
        disabled={isLast}
        on:click={() => dispatch('viewNext')}>Next</button
      >
    </div>
    <h3 class="subtitle">Details of log message #{logMessage.seq}</h3>
    <div id="viewer" class="logMessageDetails-value code" />

    <!-- allow the user to configure the formatter, taking the current log as example -->
    <div
      class={$logStore.formatter.collapseConfig
        ? 'logMessageDetails-config logMessageDetails-config--collapsed'
        : 'logMessageDetails-config'}
    >
      <button
        class="subtitle button logMessageDetails-configToggler"
        on:click={logStore.toggleFormatterConfig}
      >
        <span>&blacktriangledown</span>
        Configure the log format
      </button>
      <div class="formatterConfig">
        <div class="formatterConfig-value">
          <h4>
            Formatter
            <button class="button button--small" on:click={resetFormatter}>reset</button>
            <div class="formatterConfig-keybindingSelector">
              <button on:click={() => (keybinding = 'vim')} class:selected={keybinding == 'vim'}
                >vim</button
              >
              <button
                on:click={() => (keybinding = 'normal')}
                class:selected={keybinding == 'normal'}>normal</button
              >
            </div>
          </h4>
          <div id="editor" class="code" />
        </div>
        <div class="formatterConfig-preview">
          <h4>Example</h4>
          <div class="code">{formatObject(formattedExample.formattedMessage, 'json5')}</div>
        </div>
      </div>
    </div>
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
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
  }
  .logMessageDetails-actions > *:not(:last-child) {
    margin-right: 10px;
  }
  .logMessageDetails-actions .logMessageDetails-closeButton {
    margin-right: auto;
  }
  .logMessageDetails-container {
    display: flex;
    flex-direction: column;
    background-color: #f5f5f5;
    position: relative;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    margin-top: 20px;
    margin-bottom: 20px;
    padding: 20px 30px;
    border-radius: 10px;
    box-shadow: 0px 2px 5px 0px #444;
    height: calc(100% - 40px);
    overflow: auto;
  }
  .code {
    white-space: pre;
    font-family: monospace;
    background-color: white;
    line-height: 1.2rem;
    text-align: left;
    overflow: auto;
    border: 1px solid #dedede;
    border-radius: 3px;
    padding: 10px;
    width: 100%;
  }

  .logMessageDetails-value {
    flex-grow: 1;
  }
  .logMessageDetails-config .subtitle {
    margin-top: 30px;
    margin-bottom: 14px;
    border: none;
    background-color: transparent;
    padding: 0px;
    text-transform: uppercase;
    font-size: 17px;
    letter-spacing: 1.3px;
  }
  .logMessageDetails-configToggler span {
    display: inline-block;
  }
  .logMessageDetails-config--collapsed .logMessageDetails-configToggler span {
    transform: rotate(-90deg);
  }
  .formatterConfig {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
  }
  .logMessageDetails-config--collapsed .formatterConfig {
    max-height: 0px;
    overflow: hidden;
  }
  .formatterConfig > * {
    width: 50%;
  }
  .formatterConfig > *:not(:last-child) {
    margin-right: 20px;
  }
  .formatterConfig-value h4 {
    display: flex;
    align-items: center;
  }
  .formatterConfig-value .button {
    margin-left: 4px;
  }
  .formatterConfig-keybindingSelector {
    margin-left: auto;
  }
  .formatterConfig-keybindingSelector button {
    padding: 0px;
    margin: 0px;
    border: none;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 1px;
    cursor: pointer;
  }
  .formatterConfig-keybindingSelector button:not(:last-child)::after {
    content: '|';
    margin-left: 5px;
  }
  .formatterConfig-keybindingSelector .selected {
    font-weight: bold;
  }
  .formatterConfig-value .code {
    height: 200px;
    margin: 0px;
    overflow: hidden;
  }
  .formatterConfig-preview .code {
    height: 200px;
  }
  h3 {
    text-align: left;
    margin-top: 30px;
    margin-bottom: 14px;
    text-transform: uppercase;
    font-size: 17px;
    letter-spacing: 1.3px;
  }
  h4 {
    text-align: left;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 01px;
    color: #666;
    font-size: 12px;
    margin-top: 0px;
  }
</style>
