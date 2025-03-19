import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// API base URL - updated with Render URL
// For local testing on iOS simulator, use http://localhost:4000
// For local testing on Android emulator, use http://10.0.2.2:4000
// For production, use your Render URL
const API_URL = Platform.select({
  ios: __DEV__
    ? 'http://localhost:4000/api'
    : 'https://dealbreaker-api.onrender.com/api',
  android: __DEV__
    ? 'http://10.0.2.2:4000/api'
    : 'https://dealbreaker-api.onrender.com/api',
  default: 'https://dealbreaker-api.onrender.com/api'
})

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 seconds
})

// Get flag history from API
export const getFlagHistory = async (profileId, flagId) => {
  try {
    console.log(
      `Fetching flag history for profile ${profileId}, flag ${flagId}`
    )
    const response = await api.get(`/flagHistory/${profileId}/${flagId}`)
    console.log('History fetched successfully:', response.data.length, 'items')

    // Cache the result locally
    await AsyncStorage.setItem(
      `flagHistory_${profileId}_${flagId}`,
      JSON.stringify(response.data)
    )

    return response.data
  } catch (error) {
    console.error('Error fetching flag history from API:', error)

    // Fall back to local storage
    return await getFlagHistoryLocal(profileId, flagId)
  }
}

// Add flag history entry to API
export const addFlagHistory = async (
  profileId,
  flagId,
  flagTitle,
  previousStatus,
  newStatus,
  reason = ''
) => {
  try {
    // Create the history entry object
    const historyEntry = {
      profileId,
      flagId,
      flagTitle: String(flagTitle),
      timestamp: new Date(),
      previousStatus,
      newStatus,
      reason,
      attachments: []
    }

    console.log(
      'Sending flag history entry to API:',
      JSON.stringify(historyEntry, null, 2)
    )

    // Send to API
    const response = await api.post('/flagHistory', historyEntry)
    console.log('Flag history added successfully:', response.data)

    // Also update local cache
    const existingHistory = await getFlagHistoryLocal(profileId, flagId)
    const updatedHistory = [...existingHistory, response.data]
    await AsyncStorage.setItem(
      `flagHistory_${profileId}_${flagId}`,
      JSON.stringify(updatedHistory)
    )

    return response.data
  } catch (error) {
    console.error('Error adding flag history to API:', error)
    if (error.response) {
      console.error('Server response:', error.response.data)
      console.error('Status code:', error.response.status)
    } else if (error.request) {
      console.error('No response received from server')
    }

    // Store locally and queue for later sync
    try {
      const offlineEntry = {
        _id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        profileId,
        flagId,
        flagTitle: String(flagTitle),
        timestamp: new Date(),
        previousStatus,
        newStatus,
        reason,
        attachments: []
      }

      // Store locally
      const existingHistory = await getFlagHistoryLocal(profileId, flagId)
      const updatedHistory = [...existingHistory, offlineEntry]
      await AsyncStorage.setItem(
        `flagHistory_${profileId}_${flagId}`,
        JSON.stringify(updatedHistory)
      )

      // Queue for sync
      await storePendingChange('addFlagHistory', offlineEntry)

      console.log('Flag history stored locally for later sync')
      return offlineEntry
    } catch (storageError) {
      console.error('Failed to store history entry locally:', storageError)
      return null
    }
  }
}

// Local storage functions
export const getFlagHistoryLocal = async (profileId, flagId) => {
  try {
    const history = await AsyncStorage.getItem(
      `flagHistory_${profileId}_${flagId}`
    )
    const parsedHistory = history ? JSON.parse(history) : []

    // Sort by timestamp (newest first)
    return parsedHistory.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  } catch (error) {
    console.error('Error fetching local flag history:', error)
    return []
  }
}

// Store pending change
export const storePendingChange = async (action, data) => {
  try {
    const pendingChanges = await AsyncStorage.getItem('pendingChanges')
    const changes = pendingChanges ? JSON.parse(pendingChanges) : []

    changes.push({
      action,
      data,
      timestamp: new Date()
    })

    await AsyncStorage.setItem('pendingChanges', JSON.stringify(changes))
  } catch (error) {
    console.error('Error storing pending change:', error)
  }
}

// Sync pending changes
export const syncPendingChanges = async () => {
  try {
    console.log('Starting sync process...')
    const pendingChanges = await AsyncStorage.getItem('pendingChanges')
    console.log('Pending changes from storage:', pendingChanges)

    if (!pendingChanges) {
      console.log('No pending changes found in storage')
      return false
    }

    const changes = JSON.parse(pendingChanges)
    if (changes.length === 0) {
      console.log('No changes to sync (empty array)')
      return false
    }

    console.log(`Attempting to sync ${changes.length} pending changes`)
    console.log('Changes data:', JSON.stringify(changes, null, 2))

    // Send to API
    const response = await api.post('/flagHistory/sync', { changes })

    if (response.data.success) {
      // Clear the synced changes
      await AsyncStorage.setItem('pendingChanges', JSON.stringify([]))
      console.log(`Successfully synced ${response.data.count} changes`)
      return true
    }

    return false
  } catch (error) {
    console.error('Error syncing pending changes:', error)
    if (error.response) {
      console.error('Server response:', error.response.data)
      console.error('Status code:', error.response.status)
    } else if (error.request) {
      console.error('No response received from server')
    }
    return false
  }
}

// Add attachment to history
export const addAttachmentToHistory = async (historyId, attachment) => {
  try {
    // Send to API
    const response = await api.post(`/flagHistory/${historyId}/attachment`, {
      attachment
    })
    console.log('Attachment added successfully:', response.data)

    // Update local cache
    await updateLocalAttachment(historyId, attachment)

    return true
  } catch (error) {
    console.error('Error adding attachment to API:', error)

    // Store locally and queue for sync
    try {
      await updateLocalAttachment(historyId, attachment)
      await storePendingChange('addAttachment', { historyId, attachment })

      return true
    } catch (storageError) {
      console.error('Failed to store attachment locally:', storageError)
      return false
    }
  }
}

// Helper to update attachment in local storage
const updateLocalAttachment = async (historyId, attachment) => {
  const allKeys = await AsyncStorage.getAllKeys()
  const historyKeys = allKeys.filter(key => key.startsWith('flagHistory_'))

  for (const key of historyKeys) {
    const history = await AsyncStorage.getItem(key)
    if (history) {
      const parsedHistory = JSON.parse(history)
      const updatedHistory = parsedHistory.map(item => {
        if (item._id === historyId) {
          return {
            ...item,
            attachments: [...(item.attachments || []), attachment]
          }
        }
        return item
      })

      if (JSON.stringify(parsedHistory) !== JSON.stringify(updatedHistory)) {
        await AsyncStorage.setItem(key, JSON.stringify(updatedHistory))
        break // Found and updated the entry
      }
    }
  }
}
