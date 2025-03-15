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
  const handleDealbreakers = async () => {
    if (isDealbreakerMountRef.current && dealbreaker) {
      setList('dealbreaker', dealbreaker)
    } else {
      isDealbreakerMountRef.current = true
      const dealbreaker = await getList('dealbreaker')
      if (dealbreaker) {
        setDealbreaker(dealbreaker)
      }
    }
  }
  const handleProfiles = async () => {
    if (isProfileMountRef.current && profile) {
      setList('profile', profile)
    } else {
      isProfileMountRef.current = true
      const profile = await getList('profile')
      if (profile) {
        setProfile(profile)
      }
    }
  }
  const handleCurrentProfile = async () => {
    if (isCurrentProfileMountRef.current && currentProfile) {
      setAtomicValue('currentProfile', currentProfile)
    } else {
      isCurrentProfileMountRef.current = true
      const currentProfile = await getAtomicValue('currentProfile')
      if (currentProfile) {
        setCurrentProfile(currentProfile)
      }
    }
  }
  console.log('app dealbreaker: ', dealbreaker)
  useEffect(() => {
    handleDealbreakers()
  }, [dealbreaker])

  useEffect(() => {
    handleProfiles()
  }, [profile])

  useEffect(() => {
    handleCurrentProfile()
  }, [currentProfile])
  //   useEffect(() => {
  //     clearStorage()
  //   }, [])

  return (
    <StoreContext.Provider
      value={{
        dealbreaker,
        profile,
        setDealbreaker,
        setProfile,
        currentProfile,
        setCurrentProfile
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
