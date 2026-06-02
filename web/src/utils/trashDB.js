import { getOfflineItem, setOfflineItem } from './offlineDB';

/**
 * Moves an item from its original offline store key to the global zaiqa_mahal_trash register.
 * @param {string} originalKey - The IndexedDB storage key (e.g. 'zaiqa_mahal_delivery_customers')
 * @param {object} item - The actual item object being deleted
 * @param {string} uniqueIdField - The key field that uniquely identifies this item (e.g. 'phone' or 'id')
 */
export const moveToTrash = async (originalKey, item, uniqueIdField) => {
  try {
    // 1. Get original list
    const originalList = await getOfflineItem(originalKey, []);
    // 2. Remove item from original list
    const updatedOriginalList = originalList.filter(
      x => String(x[uniqueIdField]) !== String(item[uniqueIdField])
    );
    await setOfflineItem(originalKey, updatedOriginalList);

    // 3. Append to trash list
    const trashList = await getOfflineItem('zaiqa_mahal_trash', []);
    const trashItem = {
      trashId: 'TRASH-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      originalKey,
      deletedAt: Date.now(),
      uniqueIdField,
      data: item
    };
    trashList.unshift(trashItem);
    await setOfflineItem('zaiqa_mahal_trash', trashList);
    
    return true;
  } catch (err) {
    console.error('Error soft-deleting item to trash:', err);
    return false;
  }
};

/**
 * Restores an item back to its original IndexedDB store and removes it from the trash.
 * @param {string} trashId - The unique trash registry item ID
 */
export const restoreFromTrash = async (trashId) => {
  try {
    const trashList = await getOfflineItem('zaiqa_mahal_trash', []);
    const trashIndex = trashList.findIndex(t => t.trashId === trashId);
    if (trashIndex === -1) return false;

    const trashItem = trashList[trashIndex];
    const { originalKey, data } = trashItem;

    // 1. Put item back into original list
    const originalList = await getOfflineItem(originalKey, []);
    
    // Avoid duplication
    const uniqueIdField = trashItem.uniqueIdField || 'id';
    const updatedOriginalList = [
      data,
      ...originalList.filter(x => String(x[uniqueIdField]) !== String(data[uniqueIdField]))
    ];
    await setOfflineItem(originalKey, updatedOriginalList);

    // 2. Remove from trash list
    const updatedTrashList = trashList.filter(t => t.trashId !== trashId);
    await setOfflineItem('zaiqa_mahal_trash', updatedTrashList);

    return true;
  } catch (err) {
    console.error('Error restoring item from trash:', err);
    return false;
  }
};

/**
 * Deletes an item from the trash permanently.
 * @param {string} trashId 
 */
export const deletePermanentlyFromTrash = async (trashId) => {
  try {
    const trashList = await getOfflineItem('zaiqa_mahal_trash', []);
    const updatedTrashList = trashList.filter(t => t.trashId !== trashId);
    await setOfflineItem('zaiqa_mahal_trash', updatedTrashList);
    return true;
  } catch (err) {
    console.error('Error permanently deleting from trash:', err);
    return false;
  }
};

/**
 * Sweeps the trash list and permanently purges any items deleted more than 30 days ago.
 */
export const purgeExpiredTrash = async () => {
  try {
    const trashList = await getOfflineItem('zaiqa_mahal_trash', []);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const activeTrash = trashList.filter(t => {
      const isExpired = (now - t.deletedAt) > THIRTY_DAYS_MS;
      if (isExpired) {
        console.log(`[Auto-Purge] Permanently deleted expired item: ${t.trashId} (deleted at ${new Date(t.deletedAt).toLocaleDateString()})`);
      }
      return !isExpired;
    });

    await setOfflineItem('zaiqa_mahal_trash', activeTrash);
  } catch (err) {
    console.error('Error executing auto-purge sweep:', err);
  }
};
