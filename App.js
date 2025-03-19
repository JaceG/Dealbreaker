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
  const [isLoaded, setIsLoaded] = useState(false)
  const isProfileMountRef = useRef(false)
  const isCurrentProfileMountRef = useRef(false)

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

        // Load profile list
        const savedProfile = await getList('profile')
        if (savedProfile && savedProfile.length > 0) {
          console.log('Loaded profile list from storage:', savedProfile)
          setProfile(savedProfile)
        } else {
          console.log('No saved profile list found, using defaults')
        }

        // Load current profile
        const savedCurrentProfile = await getAtomicValue('currentProfile')
        if (savedCurrentProfile) {
          console.log(
            'Loaded current profile from storage:',
            savedCurrentProfile
          )
          setCurrentProfile(savedCurrentProfile)
        } else {
          console.log('No saved current profile found, using main')
        }

        setIsLoaded(true)
      } catch (error) {
        console.error('Error loading data:', error)
        setIsLoaded(true)
      }
    }

    loadAllData()
  }, [])

  // Save dealbreaker state whenever it changes
  useEffect(() => {
    // Only save if the app has finished initial loading
    if (isLoaded) {
      console.log('Saving dealbreaker state to storage')
      setList('dealbreaker', dealbreaker)
    }
  }, [dealbreaker, isLoaded])

  // Save profile list whenever it changes
  useEffect(() => {
    // Only save if the app has finished initial loading
    if (isLoaded) {
      console.log('Saving profile list to storage')
      setList('profile', profile)
    }
  }, [profile, isLoaded])

  // Save current profile whenever it changes
  useEffect(() => {
    // Only save if the app has finished initial loading
    if (isLoaded) {
      console.log('Saving current profile to storage')
      setAtomicValue('currentProfile', currentProfile)
    }
  }, [currentProfile, isLoaded])

  // Create a function to safely update dealbreaker state
  const updateDealbreaker = newState => {
    console.log('Updating dealbreaker state with:', JSON.stringify(newState))
    setDealbreaker(newState)
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

      // Update the state with new profile
      setDealbreaker(updatedDealbreaker)
      return true
    }
    return false
  }

  // Use this function to ensure the current profile exists whenever it changes
  useEffect(() => {
    if (isLoaded) {
      ensureProfileExists(currentProfile)
    }
  }, [currentProfile, isLoaded])

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

  console.log('app dealbreaker: ', dealbreaker)

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

  // Function to rename a profile
  const renameProfile = (oldName, newName) => {
    // Don't allow renaming main profile
    if (oldName === 'main') {
      console.log('Cannot rename the main profile')
      return false
    }

    // Don't allow renaming to "main"
    if (newName.toLowerCase() === 'main') {
      console.log('Cannot rename a profile to "main"')
      return false
    }

    // Check if old profile exists
    if (!profile.includes(oldName)) {
      console.log('Profile does not exist:', oldName)
      return false
    }

    // Check if new name already exists
    if (profile.some(p => p.toLowerCase() === newName.toLowerCase())) {
      console.log('Profile name already exists:', newName)
      return false
    }

    console.log('Renaming profile from', oldName, 'to', newName)

    // Create a copy of the current profiles array with the renamed profile
    const updatedProfiles = profile.map(p => (p === oldName ? newName : p))

    // Create a copy of the dealbreaker state with the renamed profile
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))
    updatedDealbreaker[newName] = updatedDealbreaker[oldName]
    delete updatedDealbreaker[oldName]

    // If we're renaming the current profile, update the current profile
    if (currentProfile === oldName) {
      setCurrentProfile(newName)
    }

    // Update the profiles array and dealbreaker state
    setProfile(updatedProfiles)
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
        deleteProfile,
        renameProfile
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
