import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'

// Request required permissions for image picking
export const requestImagePickerPermissions = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return status === 'granted'
  } catch (error) {
    console.error('Error requesting image picker permissions:', error)
    return false
  }
}

// Process image selection result
export const processImageResult = result => {
  if (!result || result.canceled) {
    return null
  }

  // Handle result format (Expo SDK 48+ uses assets array)
  const selectedAsset = result.assets ? result.assets[0] : result

  return {
    uri: selectedAsset.uri,
    width: selectedAsset.width,
    height: selectedAsset.height,
    type: 'image',
    name: selectedAsset.fileName || `image-${Date.now()}.jpg`,
    mimeType: selectedAsset.mimeType || 'image/jpeg'
  }
}

// Get image dimensions
export const getImageDimensions = async uri => {
  try {
    const { width, height } = await ImagePicker.getImageDimensionsAsync(uri)
    return { width, height }
  } catch (error) {
    console.error('Error getting image dimensions:', error)
    return { width: 0, height: 0 }
  }
}

// Check if file is an image
export const isImageFile = uri => {
  if (!uri) return false

  const lowerCaseUri = uri.toLowerCase()
  return (
    lowerCaseUri.endsWith('.jpg') ||
    lowerCaseUri.endsWith('.jpeg') ||
    lowerCaseUri.endsWith('.png') ||
    lowerCaseUri.endsWith('.gif') ||
    lowerCaseUri.endsWith('.webp')
  )
}

// Get file extension from URI
export const getFileExtension = uri => {
  if (!uri) return ''

  const parts = uri.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

// Get mime type from URI
export const getMimeType = uri => {
  const extension = getFileExtension(uri)

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}
