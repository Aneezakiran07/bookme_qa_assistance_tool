import { v2 as cloudinary } from 'cloudinary'

let configured = false

// this is the only place cloudinary gets configured
// every upload handler calls useCloudinary() instead of importing the SDK directly
export function useCloudinary() {
  if (!configured) {
    const config = useRuntimeConfig()
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true
    })
    configured = true
  }
  return cloudinary
}
