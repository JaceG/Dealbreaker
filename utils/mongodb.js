import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
// Import from our API client
import {
  getFlagHistory as apiFetchFlagHistory,
  addFlagHistory as apiAddFlagHistory,
  addAttachmentToHistory as apiAddAttachment,
  syncPendingChanges as apiSyncPendingChanges,
  getFlagHistoryLocal
} from './api'

// Flag History functions - now using API client
export const addFlagHistory = async (
  profileId,
  flagId,
  flagTitle,
  previousStatus,
  newStatus,
  reason = '',
  profileName = 'Unknown Profile'
) => {
  return apiAddFlagHistory(
    profileId,
    flagId,
    flagTitle,
    previousStatus,
    newStatus,
    reason,
    profileName
  )
}

export const getFlagHistory = async (profileId, flagId) => {
  return apiFetchFlagHistory(profileId, flagId)
}

// Local storage functions - now using API client
export { getFlagHistoryLocal }

// Placeholder for potential future sync functionality - now using API client
export const storePendingChange = async (action, data) => {
  // This is handled by the API client
}

// Sync pending changes - now using API client
export const syncPendingChanges = async () => {
  return apiSyncPendingChanges()
}

// Placeholder function to maintain compatibility
export const connectToDatabase = async () => {
  console.log('Database connection handled by API client')
  return null
}

// Attachment functions - now using API client
export const addAttachmentToHistory = async (historyId, attachment) => {
  return apiAddAttachment(historyId, attachment)
}
