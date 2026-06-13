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
// Réessaie automatiquement en cas d'échec réseau / "Request Timeout"
// (les uploads Cloudinary échouent parfois de façon intermittente).
export function uploadBuffer(buffer, options = {}, attempts = 3) {
  return new Promise((resolve, reject) => {
    const tryUpload = (remaining) => {
      const stream = cloudinary.uploader.upload_stream(
        { timeout: 60000, ...options },
        (err, result) => {
          if (!err) return resolve(result)
          if (remaining > 1) {
            console.warn(`☁️  Upload Cloudinary échoué (${err.message || err.http_code}), nouvel essai…`)
            return tryUpload(remaining - 1)
          }
          reject(err)
        }
      )
      stream.end(buffer)
    }
    tryUpload(attempts)
  })
}

export { cloudinary }
