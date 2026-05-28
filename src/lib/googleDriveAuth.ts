import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

// In-memory token cache (strictly cached in memory to support secure single-sessions)
let cachedAccessToken: string | null = null;

export function getCachedToken(): string | null {
  return cachedAccessToken;
}

export function setCachedToken(token: string | null) {
  cachedAccessToken = token;
}

// Clear cached token if user signs out
auth.onAuthStateChanged((user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

/**
 * Initiates the interactive Google Drive OAuth flow and caches the access token.
 */
export async function connectGoogleDrive(agencyId?: string): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive');
  
  // Force consent screen to handle full verification
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = accessToken;

    if (agencyId) {
      const agencyRef = doc(db, 'agencies', agencyId);
      await updateDoc(agencyRef, {
        googleDriveConnected: true
      });
    }

    return accessToken;
  } catch (error: any) {
    console.error('Erro na conexão com Google Drive:', error);
    throw error;
  }
}
