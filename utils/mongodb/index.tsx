import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
// Import from our API client
import {
  getFlagHistory as apiFetchFlagHistory,
  addFlagHistory as apiAddFlagHistory,
  addAttachmentToHistory as apiAddAttachment,
  syncPendingChanges as apiSyncPendingChanges,
  getFlagHistoryLocal
} from '../api'

// Flag History functions - now using API client
export const addFlagHistory = async (
  profileId,
  profileName,
  flagId,
  flagTitle,
  previousStatus,
  newStatus,
  reason = '',
  creatorId = null,
  previousCardType = 'none',
  newCardType = 'none'
) => {
  try {
    // Use the provided creatorId
    const currentUserId = creatorId

    // Determine card type change
    let cardTypeChange = 'none'
    if (previousCardType === 'flag' && newCardType === 'dealbreaker') {
      cardTypeChange = 'flag-to-dealbreaker'
    } else if (previousCardType === 'dealbreaker' && newCardType === 'flag') {
      cardTypeChange = 'dealbreaker-to-flag'
    }

    // Create history object
    const historyEntry = {
      profileId,
      profileName,
      flagId,
      flagTitle,
      previousStatus,
      newStatus,
      reason,
      timestamp: new Date(),
      creatorId: currentUserId,
      // Card type transition fields
      cardTypeChange,
      previousCardType,
      newCardType
    }

    return apiAddFlagHistory(
      profileId,
      flagId,
      flagTitle,
      previousStatus,
      newStatus,
      reason,
      profileName,
      currentUserId,
      cardTypeChange,
      previousCardType,
      newCardType
    )
  } catch (error) {
    console.error('Error adding flag history:', error)
    return null
  }
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
