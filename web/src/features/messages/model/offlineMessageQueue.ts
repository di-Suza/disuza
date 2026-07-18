import type { SendMessageRequest } from './chat.types';

const DB_NAME = 'disuza-chat-outbox';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

export type QueuedChatMessage = {
  id: string;
  payload: SendMessageRequest;
  createdAt: string;
};

const canUseIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window;

const openOutboxDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!canUseIndexedDb()) {
    reject(new Error('IndexedDB is not available'));
    return;
  }

  const request = window.indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Chat outbox could not be opened'));
});

const runOutboxTransaction = async <Result>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<Result> | void,
) => {
  const db = await openOutboxDb();

  return new Promise<Result | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = executor(store);
    let result: Result | undefined;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => {
        transaction.abort();
        reject(request.error || new Error('Chat outbox request failed'));
      };
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Chat outbox transaction failed'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Chat outbox transaction aborted'));
    };
  });
};

export const queueOfflineMessage = async (payload: SendMessageRequest) => {
  const item: QueuedChatMessage = {
    id: `queued-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    payload,
    createdAt: new Date().toISOString(),
  };

  await runOutboxTransaction('readwrite', (store) => store.put(item));
  return item;
};

export const getQueuedChatMessages = async () => {
  const messages = await runOutboxTransaction<QueuedChatMessage[]>('readonly', (store) => store.getAll());
  return [...(messages || [])].sort((first, second) => (
    new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  ));
};

export const deleteQueuedChatMessage = async (id: string) => {
  await runOutboxTransaction('readwrite', (store) => store.delete(id));
};

export const isRetryableMessageSendError = (error: unknown) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!error || typeof error !== 'object') return false;

  const status = (error as { status?: unknown }).status;
  return status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';
};
