import { NavigationContainer } from '@react-navigation/native'
import { StyleSheet } from 'react-native'
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

const Drawer = createDrawerNavigator()

export default function App() {
  const [dealbreaker, setDealbreaker] = useState({
    main: {
      flag: [],
      dealbreaker: []
    }
  })

  const [profile, setProfile] = useState(['main'])
  const [currentProfile, setCurrentProfile] = useState('main')
  const isDealbreakerMountRef = useRef(false)
  const isProfileMountRef = useRef(false)
  const isCurrentProfileMountRef = useRef(false)

  // Create a function to safely update dealbreaker state
  const updateDealbreaker = newState => {
    console.log('Updating dealbreaker state with:', JSON.stringify(newState))
    setDealbreaker(newState)
    // Immediately persist to storage to prevent race conditions
    setList('dealbreaker', newState)
  }

  // Create a unified function to ensure profile exists with proper data
  const ensureProfileExists = profileName => {
    if (!profileName) return false

    if (dealbreaker && !dealbreaker[profileName]) {
      console.log('Creating missing profile:', profileName)

      // Create a properly structured deep copy
      const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

      // Initialize the profile with items from main
      updatedDealbreaker[profileName] = {
        flag: updatedDealbreaker.main?.flag?.map(item => ({ ...item })) || [],
        dealbreaker:
          updatedDealbreaker.main?.dealbreaker?.map(item => ({ ...item })) || []
      }

      // Update the state directly - will trigger save via useEffect
      setDealbreaker(updatedDealbreaker)
      return true
    }
    return false
  }

  // Function to handle adding a new item to all profiles - optimized
  const addItemToAllProfiles = (item, type) => {
    if (!item || !type) return null

    console.log('Adding item to all profiles:', item.title)

    // Get all profiles that should exist
    const allProfiles = Array.from(new Set([...profile, currentProfile]))

    // Create a single deep copy of the state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Update each profile with the new item
    allProfiles.forEach(profileName => {
      // Ensure the profile and type arrays exist
      if (!updatedDealbreaker[profileName]) {
        updatedDealbreaker[profileName] = {
          flag: [],
          dealbreaker: []
        }
      }

      if (!updatedDealbreaker[profileName][type]) {
        updatedDealbreaker[profileName][type] = []
      }

      // Add the new item to this profile
      updatedDealbreaker[profileName][type].push({ ...item })
    })

    // Update state once with all changes
    setDealbreaker(updatedDealbreaker)
    return updatedDealbreaker
  }

  // Function to handle removing an item from all profiles - optimized
  const removeItemFromAllProfiles = (itemId, type) => {
    if (!itemId || !type) return false

    console.log('Removing item from all profiles:', itemId)

    // Create a single deep copy
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Remove the item from all profiles
    Object.keys(updatedDealbreaker).forEach(profileName => {
      if (
        updatedDealbreaker[profileName] &&
        updatedDealbreaker[profileName][type]
      ) {
        // Filter out the item directly
        updatedDealbreaker[profileName][type] = updatedDealbreaker[profileName][
          type
        ].filter(item => item && item.id !== itemId)
      }
    })

    // Update state once
    setDealbreaker(updatedDealbreaker)
    return true
  }

  const handleDealbreakers = async () => {
    if (isDealbreakerMountRef.current && dealbreaker) {
      await setList('dealbreaker', dealbreaker)
    } else {
      isDealbreakerMountRef.current = true
      const savedDealbreaker = await getList('dealbreaker')
      if (savedDealbreaker) {
        setDealbreaker(savedDealbreaker)
      }
    }
  }

  const handleProfiles = async () => {
    if (isProfileMountRef.current && profile) {
      await setList('profile', profile)
    } else {
      isProfileMountRef.current = true
      const savedProfile = await getList('profile')
      if (savedProfile) {
        setProfile(savedProfile)
      }
    }
  }

  const handleCurrentProfile = async () => {
    if (isCurrentProfileMountRef.current && currentProfile) {
      await setAtomicValue('currentProfile', currentProfile)
    } else {
      isCurrentProfileMountRef.current = true
      const savedCurrentProfile = await getAtomicValue('currentProfile')
      if (savedCurrentProfile) {
        setCurrentProfile(savedCurrentProfile)
      }
    }
  }

  console.log('app dealbreaker: ', dealbreaker)

  useEffect(() => {
    // Set isDealbreakerMountRef to true before any async operations
    // to avoid race conditions
    isDealbreakerMountRef.current = true

    // Only perform storage operations if dealbreaker is defined
    if (dealbreaker) {
      setList('dealbreaker', dealbreaker)
      console.log('Saved dealbreaker state to storage')
    }
  }, [dealbreaker])

  useEffect(() => {
    // Load initial data from storage when the app mounts
    const loadInitialData = async () => {
      try {
        const savedDealbreaker = await getList('dealbreaker')
        if (savedDealbreaker) {
          console.log('Loaded dealbreaker state from storage')
          setDealbreaker(savedDealbreaker)
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    // Only load initial data if we haven't already
    if (!isDealbreakerMountRef.current) {
      loadInitialData()
    }
  }, [])

  useEffect(() => {
    handleProfiles()
  }, [profile])

  useEffect(() => {
    // Ensure the profile exists whenever the current profile changes
    if (!ensureProfileExists(currentProfile)) {
      // Only save to storage if we didn't need to create the profile
      handleCurrentProfile()
    }
  }, [currentProfile])

  // useEffect(() => {
  //   clearStorage()
  // }, [])

  // Function to delete a profile
  const deleteProfile = profileName => {
    // Multiple checks to prevent deleting the main profile
    if (
      !profileName ||
      profileName === 'main' ||
      profileName.toLowerCase() === 'main' ||
      profileName.trim() === 'main'
    ) {
      console.log('Cannot delete the main profile')
      return false
    }

    // Check if profile exists
    if (!profile.includes(profileName)) {
      console.log('Profile does not exist:', profileName)
      return false
    }

    // One last check - never delete main
    if (profileName === 'main') {
      console.error('Critical: Attempted to delete main profile - prevented')
      return false
    }

    console.log('Deleting profile:', profileName)

    // Create a copy of the current profiles array without the deleted profile
    const updatedProfiles = profile.filter(p => p !== profileName)

    // Ensure main profile still exists in the array
    if (!updatedProfiles.includes('main')) {
      console.error('Cannot delete - this would remove the main profile')
      return false
    }

    // Create a copy of the dealbreaker state without the deleted profile
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))
    delete updatedDealbreaker[profileName]

    // If we're deleting the current profile, switch to main
    if (currentProfile === profileName) {
      setCurrentProfile('main')
    }

    // Update the profiles array
    setProfile(updatedProfiles)

    // Update the dealbreaker state
    setDealbreaker(updatedDealbreaker)

    return true
  }

  return (
    <StoreContext.Provider
      value={{
        dealbreaker,
        profile,
        setDealbreaker: updateDealbreaker,
        setProfile,
        currentProfile,
        setCurrentProfile,
        addItemToAllProfiles,
        removeItemFromAllProfiles,
        ensureProfileExists,
        deleteProfile
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
