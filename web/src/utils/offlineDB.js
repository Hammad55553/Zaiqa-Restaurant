const DB_NAME = 'ZaiqaMahalDB';
const DB_VERSION = 1;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('keyValueStore')) {
        db.createObjectStore('keyValueStore', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
};

export const getOfflineItem = async (key, defaultValue = null) => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('keyValueStore', 'readonly');
      const store = transaction.objectStore('keyValueStore');
      const request = store.get(key);

      request.onsuccess = (e) => {
        const result = e.target.result;
        resolve(result ? result.value : defaultValue);
      };

      request.onerror = () => {
        resolve(defaultValue);
      };
    });
  } catch (err) {
    console.error('IndexedDB get error:', err);
    return defaultValue;
  }
};

export const setOfflineItem = async (key, value) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('keyValueStore', 'readwrite');
      const store = transaction.objectStore('keyValueStore');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB set error:', err);
  }
};

export const removeOfflineItem = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('keyValueStore', 'readwrite');
      const store = transaction.objectStore('keyValueStore');
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB delete error:', err);
  }
};
