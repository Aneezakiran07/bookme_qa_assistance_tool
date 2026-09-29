import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// this is the only place firebase-admin gets initialized
// everything else that needs to verify a token calls useFirebaseAuth()
export function useFirebaseAuth() {
  const config = useRuntimeConfig()

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: config.firebaseAdmin.projectId,
        clientEmail: config.firebaseAdmin.clientEmail,
        // env vars store literal escaped newlines, this turns them back into real ones
        privateKey: config.firebaseAdmin.privateKey?.replace(/\\n/g, '\n')
      })
    })
  }

  return getAuth()
}
