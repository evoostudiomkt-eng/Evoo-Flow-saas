import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'lead' | 'task' | 'content' | 'system';

export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      link: link || null,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const snap = await getDocs(q);
    
    const promises = snap.docs.map(d => 
      sendNotification(d.id, title, message, type, link)
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}
