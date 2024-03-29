import type { WebSocket } from 'ws';
import type { Message } from 'oi-types/message';
import { getPool } from '../util/db.js';
import webpush from 'web-push';

// HACK - Why is this type not public?
type BufferLike =
    | string
    | Buffer
    | DataView
    | number
    | ArrayBufferView
    | Uint8Array
    | ArrayBuffer
    | SharedArrayBuffer
    | readonly any[]
    | readonly number[]
    | { valueOf(): ArrayBuffer }
    | { valueOf(): SharedArrayBuffer }
    | { valueOf(): Uint8Array }
    | { valueOf(): readonly number[] }
    | { valueOf(): string }
    | { [Symbol.toPrimitive](hint: string): string };

class PushSender {
  static async send(uid: string, message: string) {
    let client;
    try {
      client = await getPool().connect();
      const q = await client.query(
        `SELECT push_endpoint, key_p256dh, key_auth FROM sessions WHERE uid = $1`,
        [uid]
      );
      await Promise.all(q.rows.map(row => {
        if (row.push_endpoint === null) {
          return Promise.resolve();
        }
        const subscription = {
          endpoint: row.push_endpoint,
          keys: {
            p256dh: row.key_p256dh,
            auth: row.key_auth,
          }
        };
        return webpush.sendNotification(subscription, message);
      }));
    } finally {
      client && client.release();
    }
  }

  static sendJson<T extends Message>(uid: string, message: T) {
    return PushSender.send(uid, JSON.stringify(message));
  }
}

export class ClientManager {
  uidToWs = new Map<string, WebSocket[]>;
  wsToUid = new Map<WebSocket, string>;

  add(ws: WebSocket, uid: string) {
    const wsArray = this.uidToWs.get(uid);
    if (!wsArray) {
      this.uidToWs.set(uid, [ws]);
    } else {
      wsArray.push(ws);
    }
    this.wsToUid.set(ws, uid);
  }

  delete(ws: WebSocket) {
    const uid = this.wsToUid.get(ws);
    if (uid === undefined) {
      return;
    }
    this.wsToUid.delete(ws);
    const wsArray = this.uidToWs.get(uid)!;
    if (wsArray.length === 1) {
      this.uidToWs.delete(uid);
    } else {
      this.uidToWs.set(uid, wsArray.filter(ws2 => ws !== ws2));
    }
  }

  getWebSockets(uid: string): WebSocket[] | undefined {
    return this.uidToWs.get(uid);
  }

  sendWsString(uid: string | string[], message: string) {
    if (Array.isArray(uid)) {
      uid.forEach(u => this.sendWsString(u, message));
      return;
    }
    const sockets = this.uidToWs.get(uid);
    if (sockets) {
      sockets.forEach(socket => socket.send(message));
    }
  }

  sendWs<T extends Message>(uid: string | string[], message: T) {
    this.sendWsString(uid, JSON.stringify(message));
  }

  sendPushString(uid: string | string[], message: string) {
    if (Array.isArray(uid)) {
      uid.forEach(u => this.sendPushString(u, message));
      return;
    }
    PushSender.send(uid, message);
  }

  sendPush<T extends Message>(uid: string | string[], message: T) {
    this.sendPushString(uid, JSON.stringify(message));
  }

  sendWsOrPush<T extends Message>(uid: string | string[], message: T, pushOk: boolean) {
    if (Array.isArray(uid)) {
      uid.forEach(u => this.sendWsOrPush(u, message, pushOk));
      return;
    }
    const sockets = this.uidToWs.get(uid);
    const json = JSON.stringify(message);
    if (sockets) {
      sockets.forEach(socket => socket.send(json));
    } else if (pushOk) {
      this.sendPushString(uid, json);
    }
  }

  sendWsAndPush<T extends Message>(uid: string | string[], message: T, pushOk: boolean) {
    const json = JSON.stringify(message);
    this.sendWsString(uid, json);
    if (pushOk) {
      this.sendPushString(uid, json);
    }
  }

  getUid(ws: WebSocket): string | undefined {
    return this.wsToUid.get(ws);
  }
}

const clients = new ClientManager;
export default clients;
