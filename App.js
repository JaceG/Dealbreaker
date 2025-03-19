import { NavigationContainer } from '@react-navigation/native'
import { StyleSheet, View, Text } from 'react-native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useState, useRef, useEffect } from 'react'
import StoreContext from './store'
import ListsScreen from './Screens/Lists'
import CreateFlagsScreen from './Screens/CreateFlags'
import Toast from 'react-native-toast-message'
import CreateProfileScreen from './Screens/CreateProfiles'
import {
  setList,
  getList,
  setAtomicValue,
  getAtomicValue,
  clearStorage
} from './utils/storage'
import NetInfo from '@react-native-community/netinfo'
import { syncPendingChanges } from './utils/api'
import { showToast } from './utils/functions'

const Drawer = createDrawerNavigator()

export default function App() {
  const [dealbreaker, setDealbreaker] = useState({
    main: {
      flag: [],
      dealbreaker: []
    }
  })

  const [profiles, setProfiles] = useState([
    { id: 'main', name: 'Main Profile' }
  ])
  const [currentProfileId, setCurrentProfileId] = useState('main')
  const [isLoaded, setIsLoaded] = useState(false)
  const isProfileMountRef = useRef(false)
  const isCurrentProfileMountRef = useRef(false)
  const [isOnline, setIsOnline] = useState(true)
  const syncInterval = useRef(null)

  // Load all data at app initialization
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Load dealbreaker data
        const savedDealbreaker = await getList('dealbreaker')
        if (savedDealbreaker && Object.keys(savedDealbreaker).length > 0) {
          console.log(
            'Loaded dealbreaker state from storage:',
            savedDealbreaker
          )
          setDealbreaker(savedDealbreaker)
        } else {
          console.log('No saved dealbreaker data found, using defaults')
        }

        // Load profiles list
        const savedProfiles = await getList('profiles')
        if (savedProfiles && savedProfiles.length > 0) {
          console.log('Loaded profiles list from storage:', savedProfiles)
          setProfiles(savedProfiles)
        } else {
          console.log('No saved profiles list found, using defaults')
        }

        // Load current profile ID
        const savedCurrentProfileId = await getAtomicValue('currentProfileId')
        if (savedCurrentProfileId) {
          console.log(
            'Loaded current profile ID from storage:',
            savedCurrentProfileId
          )
          setCurrentProfileId(savedCurrentProfileId)
        } else {
          console.log('No saved current profile ID found, using main')
        }

        setIsLoaded(true)
      } catch (error) {
        console.error('Error loading data:', error)
        setIsLoaded(true)
      }
    }

    loadAllData()
  }, [])

  // Set up network status monitoring
  useEffect(() => {
    // Set up network status monitoring
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable
      const wasOffline = !isOnline
      setIsOnline(online)

      // If we just came back online and the app is loaded, sync data
      if (online && wasOffline && isLoaded) {
        syncOfflineData()
      }
    })

    return () => {
      unsubscribe()
      if (syncInterval.current) {
        clearInterval(syncInterval.current)
      }
    }
  }, [isOnline, isLoaded])

  // Set up periodic sync when online
  useEffect(() => {
    // Clear any existing interval
    if (syncInterval.current) {
      clearInterval(syncInterval.current)
      syncInterval.current = null
    }

    // If online and loaded, set up periodic sync
    if (isOnline && isLoaded) {
      syncOfflineData() // Immediate sync on connection

      // Set up periodic sync every 5 minutes
      syncInterval.current = setInterval(
        () => {
          syncOfflineData()
        },
        5 * 60 * 1000
      )
    }

    return () => {
      if (syncInterval.current) {
        clearInterval(syncInterval.current)
      }
    }
  }, [isOnline, isLoaded])

  // Function to sync offline data
  const syncOfflineData = async () => {
    try {
      const success = await syncPendingChanges()
      if (success) {
        console.log('Successfully synced offline data')
        showToast('success', 'Data synced with cloud')
      }
    } catch (error) {
      console.error('Error syncing offline data:', error)
    }
  }

  // Save dealbreaker state whenever it changes
  useEffect(() => {
    // Only save if the app has finished initial loading
    if (isLoaded) {
      console.log('Saving dealbreaker state to storage')
      setList('dealbreaker', dealbreaker)
    }
  }, [dealbreaker, isLoaded])

  // Save profiles list whenever it changes
  useEffect(() => {
    // Only save if the app has finished initial loading
    if (isLoaded) {
      console.log('Saving profiles list to storage')
      setList('profiles', profiles)
    }
  }, [profiles, isLoaded])

  // Save current profile ID whenever it changes
  useEffect(() => {
    // Only save if the app has finished initial loading
    if (isLoaded) {
      console.log('Saving current profile ID to storage')
      setAtomicValue('currentProfileId', currentProfileId)
    }
  }, [currentProfileId, isLoaded])

  // Create a function to safely update dealbreaker state
  const updateDealbreaker = newState => {
    console.log('Updating dealbreaker state with:', JSON.stringify(newState))
    setDealbreaker(newState)
  }

  // Create a unified function to ensure profile exists with proper data
  const ensureProfileExists = profileId => {
    if (!profileId) return false

    // Only create the profile if it doesn't exist yet
    if (dealbreaker && !dealbreaker[profileId]) {
      console.log('Creating missing profile:', profileId)

      // Create a properly structured deep copy
      const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

      // Initialize the profile with items from main, but reset all flags to white
      // Get items from main profile
      const mainFlags =
        updatedDealbreaker.main?.flag?.map(item => ({
          ...item,
          flag: 'white' // Reset all flags to white
        })) || []

      // Get dealbreakers from main (these go to flag list as white flags)
      const mainDealbreakers =
        updatedDealbreaker.main?.dealbreaker?.map(item => ({
          ...item,
          flag: 'white' // Reset all flags to white
        })) || []

      // For a new profile, all items start in the flag list with white color
      updatedDealbreaker[profileId] = {
        flag: [...mainFlags, ...mainDealbreakers], // All items go to flags list
        dealbreaker: [] // Start with empty dealbreaker list
      }

      // Update the state with new profile
      setDealbreaker(updatedDealbreaker)
      return true
    }
    return false
  }

  // Use this function to ensure the current profile exists whenever it changes
  useEffect(() => {
    if (isLoaded && currentProfileId) {
      // Only call ensureProfileExists if the profile doesn't exist yet
      if (!dealbreaker[currentProfileId]) {
        console.log('Need to initialize profile:', currentProfileId)
        ensureProfileExists(currentProfileId)
      }
    }
  }, [currentProfileId, isLoaded, dealbreaker])

  // Function to handle adding a new item to all profiles - optimized
  const addItemToAllProfiles = (item, type) => {
    if (!item || !type) return null

    console.log('Adding item to all profiles:', item.title)

    // Get all profile IDs that should exist
    const allProfileIds = Array.from(
      new Set([...profiles.map(p => p.id), currentProfileId])
    )

    // Create a single deep copy of the state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Update each profile with the new item
    allProfileIds.forEach(profileId => {
      // Ensure the profile and type arrays exist
      if (!updatedDealbreaker[profileId]) {
        updatedDealbreaker[profileId] = {
          flag: [],
          dealbreaker: []
        }
      }

      if (!updatedDealbreaker[profileId][type]) {
        updatedDealbreaker[profileId][type] = []
      }

      // Add the new item to this profile - for main profile, add as is
      // For other profiles, if adding to flag list, ensure it's white
      if (profileId === 'main' || type === 'dealbreaker') {
        // Add as is to main profile or to dealbreaker list
        updatedDealbreaker[profileId][type].push({ ...item })
      } else {
        // For non-main profiles, add to flag list with white color
        updatedDealbreaker[profileId][type].push({
          ...item,
          flag: 'white' // Override with white flag
        })
      }
    })

    // Update state once with all changes
    setDealbreaker(updatedDealbreaker)
    return updatedDealbreaker
  }

  // Function to handle removing an item from all profiles - optimized
  const removeItemFromAllProfiles = (itemId, type) => {
    if (!itemId || !type) return false

    console.log('Removing item from all profiles:', itemId)

    // Create a single deep copy of the state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Remove the item from all profiles
    Object.keys(updatedDealbreaker).forEach(profileId => {
      if (
        updatedDealbreaker[profileId] &&
        updatedDealbreaker[profileId][type]
      ) {
        updatedDealbreaker[profileId][type] = updatedDealbreaker[profileId][
          type
        ].filter(item => item.id !== itemId)
      }
    })

    // Update state once with all changes
    setDealbreaker(updatedDealbreaker)
    return true
  }

  console.log('app dealbreaker: ', dealbreaker)

  // Function to delete a profile
  const deleteProfile = profileId => {
    // Multiple checks to prevent deleting the main profile
    if (
      !profileId ||
      profileId === 'main' ||
      profileId.toLowerCase() === 'main' ||
      profileId.trim() === 'main'
    ) {
      console.log('Cannot delete the main profile')
      return false
    }

    // Check if profile exists
    if (!profiles.some(p => p.id === profileId)) {
      console.log('Profile does not exist:', profileId)
      return false
    }

    // Extra check to prevent deleting the main profile
    if (profileId === 'main') {
      console.error('Critical: Attempted to delete main profile - prevented')
      return false
    }

    console.log('Deleting profile:', profileId)

    // Create a copy of the current profiles array without the deleted profile
    const updatedProfiles = profiles.filter(p => p.id !== profileId)

    // Create a copy of the dealbreaker state without the deleted profile
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))
    delete updatedDealbreaker[profileId]

    // If we're deleting the current profile, switch to main
    if (currentProfileId === profileId) {
      console.log('Deleting current profile - switching to main')
      setCurrentProfileId('main')
    }

    // Update state
    setProfiles(updatedProfiles)
    setDealbreaker(updatedDealbreaker)
    return true
  }

  // Function to rename a profile
  const renameProfile = (profileId, newName) => {
    // Validate profileId and newName
    if (!profileId || !newName || newName.trim() === '') return false

    // Find the profile in the array
    const profileIndex = profiles.findIndex(p => p.id === profileId)
    if (profileIndex === -1) {
      console.log('Profile not found:', profileId)
      return false
    }

    console.log(`Renaming profile ${profileId} to: ${newName}`)

    // Create a copy of the profiles array with the updated name
    const updatedProfiles = [...profiles]
    updatedProfiles[profileIndex] = {
      ...updatedProfiles[profileIndex],
      name: newName.trim()
    }

    // Update state
    setProfiles(updatedProfiles)
    return true
  }

  // Function to create a new profile
  const createProfile = name => {
    if (!name || name.trim() === '') return null

    // Generate a unique ID for the new profile
    const newId = 'profile_' + Date.now()

    // Create the new profile object
    const newProfile = { id: newId, name: name.trim() }

    // Add the profile to the profiles array first
    setProfiles([...profiles, newProfile])

    // Now create a separate dealbreaker update
    // We'll create a completely new copy of the state
    const updatedDealbreaker = {}

    // First, copy ALL existing profiles exactly as they are
    Object.keys(dealbreaker).forEach(profileKey => {
      updatedDealbreaker[profileKey] = JSON.parse(
        JSON.stringify(dealbreaker[profileKey])
      )
    })

    // Now create the new profile with white flags
    // Create arrays of new objects with white flags
    const newProfileFlags =
      dealbreaker.main?.flag?.map(item => {
        return {
          ...JSON.parse(JSON.stringify(item)),
          flag: 'white'
        }
      }) || []

    const newProfileDealbreakers =
      dealbreaker.main?.dealbreaker?.map(item => {
        return {
          ...JSON.parse(JSON.stringify(item)),
          flag: 'white'
        }
      }) || []

    // Add the new profile data
    updatedDealbreaker[newId] = {
      flag: [...newProfileFlags, ...newProfileDealbreakers],
      dealbreaker: []
    }

    // Update the dealbreaker state
    setDealbreaker(updatedDealbreaker)

    return newId
  }

  return (
    <StoreContext.Provider
      value={{
        dealbreaker,
        setDealbreaker: updateDealbreaker,
        profiles,
        setProfiles,
        currentProfileId,
        setCurrentProfileId,
        ensureProfileExists,
        addItemToAllProfiles,
        removeItemFromAllProfiles,
        deleteProfile,
        renameProfile,
        createProfile,
        isOnline,
        syncData: syncOfflineData
      }}>
      <NavigationContainer>
        <Drawer.Navigator>
          <Drawer.Screen name='Flags List' component={ListsScreen} />
          <Drawer.Screen name='Create Flag' component={CreateFlagsScreen} />
          <Drawer.Screen
            name='Create Profile'
            component={CreateProfileScreen}
          />
        </Drawer.Navigator>
        <Toast />
      </NavigationContainer>
    </StoreContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center'
  }
})
