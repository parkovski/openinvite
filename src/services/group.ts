import { Observable } from 'rxjs';
import Entity from './entity';
import { fetchJson, fetchText } from '../js/fetch';
import webSocketService from './websocket';

const enum Membership {
  Requested = -1,
  Invited = 0,
  Member = 1,
  Admin = 2,
}

interface ListGroup {
  id: string;
  name: string;
  kind: Membership;
}

interface Member {
  id: string;
  name: string;
  username: string;
  kind: Membership;
}

interface Group {
  id: string;
  name: string;
  public: boolean;
  memberKind: number | null;
  members?: Member[];
}

interface GroupChatMessage {
  to: string;
  text: string;
}

interface OutgoingGroupChatMessage extends GroupChatMessage {
  m: 'groupchat';
  uuid: string;
}

interface IncomingGroupChatMessage extends GroupChatMessage {
  m: 'groupchat';
  from: string;
  time: string;
}

interface GroupMessageSentMessage {
  m: 'group_message_sent';
  uuid: string;
  id: string;
  time: string;
  text: string;
}

class GroupService {
  groups: Entity<ListGroup[]>;
  groupMap = new Map<string, Entity<Group>>;

  constructor() {
    this.groups = new Entity<ListGroup[]>(() => fetchJson(`/groups`));
  }

  getGroups() {
    return this.groups;
  }

  getGroup(id: string) {
    let group = this.groupMap.get(id);
    if (!group) {
      group = new Entity<Group>(() => fetchJson(`/groups/${id}`));
      this.groupMap.set(id, group);
    }
    return group;
  }

  getGroupChat(id: string) {
    return fetchJson(`/groups/${id}/chat`);
  }

  newGroup(name: string, invited: string[], isPublic: boolean) {
    return fetchText(`/newgroup`, {
      method: 'POST',
      body: new URLSearchParams({
        name,
        invited: JSON.stringify(invited),
        public: ''+isPublic,
      }),
    });
  }

  joinGroup(id: string) {
    return fetchText(`/groups/${id}/join`, { method: 'POST' });
  }

  leaveGroup(id: string) {
    return fetchText(`/groups/${id}/leave`, { method: 'POST' });
  }

  observeMessageSent() {
    return new Observable<GroupMessageSentMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<GroupMessageSentMessage>('group_message_sent', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
  }

  observeMessageReceived() {
    return new Observable<IncomingGroupChatMessage>(subscriber => {
      const subscription =
        webSocketService.subscribe<IncomingGroupChatMessage>('groupchat', msg => {
          subscriber.next(msg);
        });
      return () => subscription.unsubscribe();
    });
  }

  send(msg: GroupChatMessage) {
    const outgoingMsg: OutgoingGroupChatMessage = {
      m: 'groupchat',
      uuid: crypto.randomUUID(),
      ...msg,
    };
    webSocketService.sendJson(outgoingMsg);
    return outgoingMsg;
  }
}

const service = new GroupService;
export default service;
