<script lang="ts">
  import { logStore } from "./log-store";

  logStore.subscribe((logs) => {
    if (logs.mode == "tail") {
      scrollToBottom();
    }
  });

  function scrollToBottom() {
    const element = document.getElementById("windowLogs");
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }
</script>

<main>
  <p>
    Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn
    how to build Svelte apps.
  </p>
  <h1>Log <small>{$logStore.count} items</small></h1>
  <section id="windowLogs" class="windowLogs">
    {#each $logStore.window as msg}
      <div>{msg.timestamp}</div>
    {/each}
  </section>
</main>

<style>
  .windowLogs {
    height: 500px;
    overflow: auto;
    width: 500px;
    margin: auto;
  }
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
