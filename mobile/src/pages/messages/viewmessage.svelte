<script>
  import {
    Page,
    Navbar,
    Block,
    Link,
  } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import chatService from '../../services/chat';
  import userService from '../../services/user';
  import Chat from '../../components/chat.svelte';

  export let f7route;

  let hasContact = false;
  let userName = null;
  let chats = [];
  let pendingChats = [];

  function onSend(text) {
    const pending = chatService.send({
      to: f7route.params.id,
      text,
    });
    pendingChats = [...pendingChats, pending];
  }

  onMount(() => {
    const myUid = localStorage.getItem('uid');

    let messageSentSubscription;
    let messageReceivedSubscription;

    userService.getUser(f7route.params.id).then(u => userName = u.name);

    userService.hasContact(f7route.params.id).then(hc => {
      hasContact = hc;

      if (!hc) {
        return;
      }

      chatService.getChat(f7route.params.id).then(cs => {
        chats = cs.map(c => ({
          id: c.id,
          to: c.uid_from === myUid ? c.uid_from : undefined,
          from: c.uid_from === myUid ? undefined : c.uid_from,
          fromName: c.name_from,
          text: c.message,
        }));
        const unread = cs.filter(c => c.uid_from !== myUid && !c.received).map(c => c.id);
        chatService.acknowledge(unread, f7route.params.id);
      });

      messageSentSubscription = chatService.messageSent(msg => {
        const chat = pendingChats.find(pend => pend.uuid === msg.uuid);
        if (chat) {
          pendingChats = pendingChats.filter(pend => pend.uuid !== msg.uuid);
          chats = [...chats, {
            id: msg.id,
            to: msg.to,
            text: msg.text,
          }];
        }
      });

      messageReceivedSubscription = chatService.messageReceived(msg => {
        if (msg.from === f7route.params.id) {
          chats = [...chats, {
            id: msg.id,
            from: msg.from,
            fromName: msg.fromName,
            text: msg.text,
          }];
          chatService.acknowledge(msg.id, msg.from);
        }
      });
    });

    return () => {
      messageSentSubscription && messageSentSubscription.unsubscribe();
      messageReceivedSubscription && messageReceivedSubscription.unsubscribe();
    };
  });
</script>

<Page>
  <Navbar title="{userName}" backLink="Back" />
  {#if hasContact}
    <div style="height: 100%">
      <Chat {chats} {pendingChats} {onSend} />
    </div>
  {:else}
    <Block>
      <p>Add {userName} to your contacts to send messages.</p>
      <p><Link href="/contacts/view/{f7route.params.id}/">View user profile</Link></p>
    </Block>
  {/if}
</Page>
