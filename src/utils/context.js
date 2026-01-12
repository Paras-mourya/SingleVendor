import { AsyncLocalStorage } from 'async_hooks';

const contextStorage = new AsyncLocalStorage();

class RequestContext {
  static run(data, callback) {
    return contextStorage.run(new Map(Object.entries(data)), callback);
  }

  static set(key, value) {
    const store = contextStorage.getStore();
    if (store) store.set(key, value);
  }

  static get(key) {
    const store = contextStorage.getStore();
    return store ? store.get(key) : undefined;
  }

  static getAll() {
    const store = contextStorage.getStore();
    return store ? Object.fromEntries(store.entries()) : {};
  }

  static get requestId() { return this.get('requestId'); }
  static get userId() { return this.get('userId'); }
  static get user() { return this.get('user'); }
}

export default RequestContext;
