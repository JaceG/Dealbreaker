import { Platform, ToastAndroid, Alert } from 'react-native'
import Toast from 'react-native-toast-message'

// Set to false to disable debug logs
const DEBUG_LOGGING = false

// Show toast notification
export const showToast = (type, text1, text2 = '') => {
  if (DEBUG_LOGGING) {
    console.log(`Showing toast: ${type} - ${text1} - ${text2}`)
  }

  Toast.show({
    type: type,
    text1: text1,
    text2: text2,
    position: 'bottom',
    visibilityTime: 3000,
    autoHide: true
  })
}

// Image helper functions
export const imageUtils = {
  // This function helps with processing image attachments consistently
  prepareImageAttachment: (imageUri, fileName = null) => {
    if (!imageUri) return null

    // Create a filename if one wasn't provided
    const generatedFileName = fileName || `image_${Date.now()}.jpg`

    return {
      type: 'image',
      url: imageUri,
      name: generatedFileName,
      timestamp: new Date().toISOString()
    }
  },

  // Helper function for processing video attachments
  prepareVideoAttachment: (videoUri, fileName = null) => {
    if (!videoUri) return null

    // Create a filename if one wasn't provided
    const generatedFileName = fileName || `video_${Date.now()}.mp4`

    return {
      type: 'video',
      url: videoUri,
      name: generatedFileName,
      timestamp: new Date().toISOString()
    }
  },

  // Helper function for processing audio attachments
  prepareAudioAttachment: (audioUri, duration = 0, fileName = null) => {
    if (!audioUri) return null

    // Create a filename if one wasn't provided
    const generatedFileName = fileName || `audio_${Date.now()}.m4a`

    return {
      type: 'audio',
      url: audioUri,
      name: generatedFileName,
      duration: duration, // Duration in seconds
      timestamp: new Date().toISOString()
    }
  },

  // Helper for getting proper file extensions
  getFileExtensionFromUri: uri => {
    if (!uri) return 'jpg'

    const parts = uri.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg'
  },

  // Get a proper mime type based on extension
  getMimeTypeFromUri: uri => {
    const extension = imageUtils.getFileExtensionFromUri(uri)

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'gif':
        return 'image/gif'
      case 'heic':
        return 'image/heic'
      case 'mp4':
      case 'mov':
        return 'video/mp4'
      case 'm4a':
      case 'mp3':
      case 'aac':
        return 'audio/mp4'
      default:
        return 'application/octet-stream'
    }
  },

  // Format duration in seconds to MM:SS format
  formatDuration: seconds => {
    if (!seconds) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}
