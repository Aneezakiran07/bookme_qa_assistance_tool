import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const app = initializeApp({
    apiKey: config.public.firebase.apiKey,
    authDomain: config.public.firebase.authDomain,
    projectId: config.public.firebase.projectId,
    appId: config.public.firebase.appId
  })

  return {
    provide: {
      firebaseAuth: getAuth(app)
    }
  }
})
