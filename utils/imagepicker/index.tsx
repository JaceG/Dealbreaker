import { Alert, Platform } from 'react-native'
import ImagePicker from 'expo-image-picker'

// Get ImagePicker on demand
const getImagePicker = () => {
  try {
    return require('expo-image-picker')
  } catch (error) {
    console.warn('⚠️ ImagePicker not available in this build')
    return null
  }
}

// Mock module responses when ImagePicker isn't available
const mockMediaLibraryPermission = async () => {
  console.log('Using mock permission response for media library')
  return true
}

const mockCameraPermission = async () => {
  console.log('Using mock permission response for camera')
  return true
}

// Request permissions
export const requestMediaLibraryPermissions = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return status === 'granted'
  } catch (error) {
    console.log('Error requesting permissions:', error)
    return true // Mock will return true
  }
}

// Request camera permissions
export const requestCameraPermissions = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    return status === 'granted'
  } catch (error) {
    console.log('Error requesting camera permissions:', error)
    return true // Mock will return true
  }
}

// Pick image from library
export const pickImage = async (options = {}) => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      ...options
    })

    if (!result.canceled) {
      return result.assets[0]
    }
    return null
  } catch (error) {
    console.log('Error picking image:', error)
    return null
  }
}

// Take photo with camera
export const takePhoto = async (options = {}) => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      ...options
    })

    if (!result.canceled) {
      return result.assets[0]
    }
    return null
  } catch (error) {
    console.log('Error taking photo:', error)
    return null
  }
}
