import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';

export const templates = { ... } // unchanged

export const broadcastService = {
  sendBroadcast: async (data) => {
    const response = await fetch('/.netlify/functions/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  getBroadcastLogs: async () => {
    try {
      const q = query(
        collection(db, 'broadcast_logs'),
        orderBy('created_at', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      return [];
    }
  },

  saveDraft: async (draft) => {
    try {
      await addDoc(collection(db, 'broadcast_drafts'), {
        ...draft,
        created_at: new Date()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
