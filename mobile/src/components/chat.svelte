<script>
  import { Block, TextEditor } from 'framework7-svelte';
  import { onMount, afterUpdate } from 'svelte';
  import escapeHtml from '../js/escapehtml';

  export let chats = [];
  export let aggregate = [];
  export let pendingChats;
  export let onSend;

  let chat;
  let textEditor;
  let isScrolledToBottom = true;

  onMount(() => {
    textEditor.instance().contentEl.addEventListener('keydown', function(e) {
      if (e.composing || e.keyCode === 229) {
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const instance = textEditor.instance();
        let text = instance.value;
        if (text.endsWith('<br>')) {
          // ^^ Firefox does this so delete the trailing <br>.
          text = text.substring(0, text.length - 4);
        }
        if (text === '') {
          return;
        }
        onSend(text);
        instance.value = '';
        instance.contentEl.innerHTML = '';
      }
    });

    chat.addEventListener('scroll', () => {
      isScrolledToBottom = chat.clientHeight + chat.scrollTop === chat.scrollHeight;
    })
  });

  afterUpdate(() => {
    if (isScrolledToBottom) {
      chat.scrollTop = chat.scrollHeight;
    }
  });
</script>

<style>
  p.chatbubble {
    clear: both;
    max-width: 50%;
    display: inline-block;
    padding: 8px;
    border-radius: 8px;
    margin: 0 0 1em 0;
  }

  p.chatbubble:first-child, .chat-from:first-child {
    margin-top: 1em;
  }

  p.chatbubble:has(+ div.clear-both) {
    margin-bottom: 0;
  }

  .chat-left {
    float: left;
    background: lightgrey;
  }

  :global(.dark) .chat-left {
    background: #444;
  }

  .chat-right {
    float: right;
    text-align: right;
    background: var(--f7-theme-color);
    color: var(--f7-button-fill-text-color, #fff);
  }

  .chat-left:has(+ .chat-left), .chat-right:has(+ .chat-right) {
    margin-bottom: .25em;
  }

  .chat-from {
    float: left;
    clear: both;
    margin: 0;
    font-size: 85%;
  }

  .clear-both {
    clear: both;
  }

  .container {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .chat {
    flex: 1 1 auto;
    overflow-y: scroll;
    padding: 0 var(--f7-block-padding-horizontal);
  }

  .editor {
    flex: 0 1 auto;
  }
</style>

<div class="container">
  <div bind:this={chat} class="chat">
    {#each aggregate as agg (agg.id)}
      {#if agg.chats[0].from}
        <p class="chat-from">{agg.chats[0].fromName}</p>
      {/if}
      {#each agg.chats as chat (chat.id)}
        {#if chat.from}
          <p class="chatbubble chat-left">{@html chat.text}</p>
        {:else}
          <p class="chatbubble chat-right">{@html chat.text}</p>
        {/if}
      {/each}
    {/each}
    {#each chats as chat (chat.id)}
      {#if chat.from}
        <p class="chatbubble chat-left">{@html chat.text}</p>
      {:else}
        <p class="chatbubble chat-right">{@html chat.text}</p>
      {/if}
    {/each}
    {#each pendingChats as chat (chat.uuid)}
      <p class="chatbubble chat-right chat-pending">{@html escapeHtml(chat.text)}</p>
    {/each}
    <div class="clear-both"></div>
  </div>
  <div class="editor">
    <TextEditor
      bind:this={textEditor}
      placeholder="Say something..."
      mode="popover"
      buttons={['bold', 'italic', 'underline']}
      resizable
    />
  </div>
</div>
