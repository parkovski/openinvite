<script>
  import {
    List,
    ListItem,
    Icon,
  } from 'framework7-svelte';

  import { beforeUpdate } from 'svelte';

  export let contacts = [];
  export let requestedText = ' (Requested)';

  let firstLetters = [];
  let contactsByFirstLetter = {};

  beforeUpdate(() => {
    const first = [];
    const contactsByFirst = {};
    contacts.forEach(contact => {
      let firstLetter = contact.username.charAt(0).toUpperCase();
      if (!(firstLetter in contactsByFirst)) {
        first.push(firstLetter);
        contactsByFirst[firstLetter] = [contact];
      } else {
        contactsByFirst[firstLetter].push(contact);
      }
    });
    firstLetters = first.sort();
    contactsByFirstLetter = contactsByFirst;
  });
</script>

<List style="margin-top: 0" strongIos outlineIos dividers contactsList>
  {#each firstLetters as firstLetter (firstLetter)}
    <ListItem title={firstLetter} groupTitle />
    {#each contactsByFirstLetter[firstLetter] as contact (contact.id)}
      <ListItem title={contact.username}
        footer={contact.name + (contact.kind === 0 ? requestedText : '')}
        href={`/contacts/view/${contact.id}/`}
      >
        <div slot="media">
          {#if contact.avatarUrl}
            <img src={`https://api.oi.parkovski.com/uploads/${contact.avatarUrl}`}
              alt="Profile" width="24" height="24"
              style="border-radius: 100px; vertical-align: middle"
            >
          {:else}
            <Icon ios="f7:person_fill" md="material:person" />
          {/if}
        </div>
      </ListItem>
    {/each}
  {/each}
</List>
