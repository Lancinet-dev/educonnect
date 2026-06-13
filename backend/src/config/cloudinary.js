import { v2 as cloudinary } from 'cloudinary'

let configured = false

// Configure Cloudinary si les 3 clés sont présentes dans l'environnement.
export function initCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key:    CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure:     true,
    })
    configured = true
    console.log('☁️   Cloudinary configuré')
  } else {
    console.log('☁️   Cloudinary NON configuré (uploads désactivés) — renseignez CLOUDINARY_* dans .env')
  }
  return configured
}

export function isCloudinaryConfigured() {
  return configured
}

// Upload un buffer (mémoire) vers Cloudinary via un flux.
export function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
    stream.end(buffer)
  })
}

export { cloudinary }
