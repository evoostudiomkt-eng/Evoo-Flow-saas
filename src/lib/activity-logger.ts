import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export async function logActivity(
  profile: UserProfile,
  action: string,
  entityId?: string,
  entityType?: string,
  clientId?: string
) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId: profile.uid,
      userName: profile.displayName || profile.email,
      action,
      entityId: entityId || null,
      entityType: entityType || null,
      clientId: clientId || null,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
