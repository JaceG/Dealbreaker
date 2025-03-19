import { StatusBar } from 'expo-status-bar'
import { useState, useContext, useEffect, useRef, useCallback } from 'react'
import { StyleSheet, Text, View, Dimensions, Button } from 'react-native'
import { Board, BoardRepository } from '../../libs/board/components'
import StoreContext from '../../store'
import AppButton from '../../components/AppButton'
import SwitchProfileModal from '../../components/SwitchProfileModal'
import ConfirmationModal from '../../components/ConfirmationModal'
import { showToast } from '../../utils/functions'
import { useFocusEffect } from '@react-navigation/native'

const data = [
  {
    id: 1,
    name: 'Flags',
    rows: []
  },
  {
    id: 2,
    name: 'Dealbreakers',
    rows: []
  }
]

export default function Lists({ navigation, route }) {
  let ScreenHeight = Dimensions.get('window').height - 150
  const {
    dealbreaker,
    currentProfile,
    setDealbreaker,
    removeItemFromAllProfiles
  } = useContext(StoreContext)
  const [visible, setVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const flagListIndexRef = useRef(new Map())
  const skipUpdateRef = useRef(false)
  const dealbreakerListIndexRef = useRef(new Map())
  const isMountRef = useRef(false)
  const [isRemount, setIsRemount] = useState(false)
  const [refreshKey, setRefreshKey] = useState(Date.now())

  // Helper function to ensure current profile exists
  const ensureCurrentProfileExists = () => {
    // Safety checks for initial render
    if (!dealbreaker) return false
    if (!currentProfile) return false

    // Check if the profile already exists
    if (dealbreaker[currentProfile]) return false

    console.log('Creating missing profile in Lists:', currentProfile)

    try {
      // Create a clean copy of the state
      const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

      // If main profile exists, copy items from there
      const mainFlags =
        updatedDealbreaker.main?.flag?.map(item => ({ ...item })) || []
      const mainDealbreakers =
        updatedDealbreaker.main?.dealbreaker?.map(item => ({ ...item })) || []

      // Initialize with items from main profile
      updatedDealbreaker[currentProfile] = {
        flag: mainFlags,
        dealbreaker: mainDealbreakers
      }

      // Update state once
      setDealbreaker(updatedDealbreaker)
      return true
    } catch (error) {
      console.error('Error creating profile:', error)
      return false
    }
  }

  useEffect(() => {
    // Create the profile if it doesn't exist
    if (ensureCurrentProfileExists()) {
      // Don't continue with remount - let the state update trigger it
      return
    }

    setIsRemount(true)
    setTimeout(() => {
      reloadBoard()
      setIsRemount(false)
    }, 1000)
  }, [currentProfile])

  // Handle navigation params for forced refreshes
  useEffect(() => {
    const hasRefreshParam = route.params?.refresh || route.params?.forceRefresh

    if (!hasRefreshParam) return

    console.log('Refreshing via navigation param', route.params)

    // Reset navigation params first to avoid loops
    const clearedParams = {}
    if (route.params.refresh) clearedParams.refresh = null
    if (route.params.forceRefresh) clearedParams.forceRefresh = null
    navigation.setParams(clearedParams)

    // Force UI refresh
    setRefreshKey(Date.now())

    // Check if we have data to show
    if (dealbreaker?.[currentProfile]) {
      const hasItems =
        dealbreaker[currentProfile].flag?.length > 0 ||
        dealbreaker[currentProfile].dealbreaker?.length > 0

      if (hasItems) {
        // Has items - update board
        updateBoard()
      } else {
        // No items - show empty state
        setList(null)
      }
    }
  }, [
    route.params?.refresh,
    route.params?.forceRefresh,
    currentProfile,
    dealbreaker
  ])

  const reloadBoard = () => {
    // Check if we have items to display
    const hasItems =
      dealbreaker?.[currentProfile]?.flag?.length > 0 ||
      dealbreaker?.[currentProfile]?.dealbreaker?.length > 0

    // Only update board if we have items and required conditions are met
    if (hasItems && !skipUpdateRef.current && isMountRef.current) {
      console.log('updateBoard')
      // Small timeout to ensure state is current
      setTimeout(() => updateBoard(), 50)
    } else if (!hasItems && list) {
      // If we have no items but are showing a list, reset to empty state
      setList(null)
    } else {
      // Set defaults for next time
      skipUpdateRef.current = false
      isMountRef.current = true
    }
  }
  useEffect(() => {
    reloadBoard()
  }, [dealbreaker])

  const updateBoard = () => {
    // Skip if requested
    if (skipUpdateRef.current) {
      skipUpdateRef.current = false
      return
    }

    // Ensure the current profile exists
    if (!dealbreaker[currentProfile]) {
      ensureCurrentProfileExists()
      return
    }

    // Get data from current profile with defaults for safety
    const { flag = [], dealbreaker: dealbreakerList = [] } =
      dealbreaker[currentProfile]

    // Filter out any invalid items
    const cleanFlag = flag.filter(item => item && item.id)
    const cleanDealbreakers = dealbreakerList.filter(item => item && item.id)

    // Create a fresh board data structure
    const newData = JSON.parse(JSON.stringify(data))
    flagListIndexRef.current = new Map()
    dealbreakerListIndexRef.current = new Map()

    // Map flags to board rows
    newData[0].rows = cleanFlag.map((item, index) => {
      flagListIndexRef.current.set(item.id, index)
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag
      }
    })

    // Map dealbreakers to board rows
    newData[1].rows = cleanDealbreakers.map((item, index) => {
      dealbreakerListIndexRef.current.set(item.id, index)
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag
      }
    })

    // Set the board with the processed data
    setList(new BoardRepository(newData))
  }
  const updateListOrder = (newIndex, oldIndex, id, isDealbreaker) => {
    // Safety check
    if (!dealbreaker?.[currentProfile]) return

    const { flag = [], dealbreaker: dealbreakerList = [] } =
      dealbreaker[currentProfile]
    const processList = isDealbreaker ? dealbreakerList : flag

    // More safety checks
    if (!processList || !Array.isArray(processList)) return

    let unprocessedList = null
    const newList = JSON.parse(JSON.stringify(processList))
    let oldItem = null

    if (
      (isDealbreaker &&
        dealbreakerListIndexRef.current.get(id) !== undefined) ||
      (!isDealbreaker && flagListIndexRef.current.get(id) !== undefined)
    ) {
      oldItem = { ...newList[oldIndex] }
      newList.splice(oldIndex, 1)
    } else if (isDealbreaker) {
      unprocessedList = JSON.parse(JSON.stringify(flag))
      if (oldIndex >= 0 && oldIndex < unprocessedList.length) {
        oldItem = { ...unprocessedList[oldIndex] }
        unprocessedList.splice(oldIndex, 1)
      } else {
        return // Invalid index
      }
    } else {
      unprocessedList = JSON.parse(JSON.stringify(dealbreakerList))
      if (oldIndex >= 0 && oldIndex < unprocessedList.length) {
        oldItem = { ...unprocessedList[oldIndex] }
        unprocessedList.splice(oldIndex, 1)
      } else {
        return // Invalid index
      }
    }

    // Safety check
    if (!oldItem) return

    newList.splice(newIndex, 0, oldItem)
    const type = isDealbreaker ? 'dealbreaker' : 'flag'
    skipUpdateRef.current = true
    flagListIndexRef.current = new Map()
    dealbreakerListIndexRef.current = new Map()

    newList?.forEach((item, index) => {
      if (item && item.id) {
        if (isDealbreaker) {
          dealbreakerListIndexRef.current.set(item.id, index)
        } else {
          flagListIndexRef.current.set(item.id, index)
        }
      }
    })

    if (unprocessedList) {
      unprocessedList.forEach((item, index) => {
        if (item && item.id) {
          if (isDealbreaker) {
            flagListIndexRef.current.set(item.id, index)
          } else {
            dealbreakerListIndexRef.current.set(item.id, index)
          }
        }
      })
    }

    // Update state with clean arrays (filter out any invalid items)
    const cleanNewList = newList.filter(
      item =>
        item &&
        typeof item === 'object' &&
        Object.keys(item).length > 0 &&
        item.id !== undefined
    )

    const cleanUnprocessedList = unprocessedList
      ? unprocessedList.filter(
          item =>
            item &&
            typeof item === 'object' &&
            Object.keys(item).length > 0 &&
            item.id !== undefined
        )
      : dealbreaker[currentProfile][isDealbreaker ? 'flag' : 'dealbreaker']

    setDealbreaker({
      ...dealbreaker,
      [currentProfile]: {
        ...dealbreaker[currentProfile],
        [isDealbreaker ? 'flag' : 'dealbreaker']: cleanUnprocessedList,
        [type]: cleanNewList
      }
    })

    // Force UI to update
    setIsRemount(true)
    setTimeout(() => {
      setIsRemount(false)
    }, 300)
  }

  var Styles = StyleSheet.create({ container: { height: ScreenHeight } })

  const [list, setList] = useState(null)

  // Add safety checks to prevent accessing properties of undefined
  console.log('flag: ', dealbreaker?.[currentProfile]?.flag || [])
  console.log('dealbreaker: ', dealbreaker?.[currentProfile]?.dealbreaker || [])

  const handleDeleteItem = item => {
    setItemToDelete(item)
    setDeleteModalVisible(true)
  }

  const confirmDeleteItem = () => {
    if (
      !itemToDelete ||
      !itemToDelete.attributes ||
      !itemToDelete.attributes.row
    ) {
      setDeleteModalVisible(false)
      return
    }

    const rowId = itemToDelete.attributes.row.id
    if (!rowId) {
      setDeleteModalVisible(false)
      setItemToDelete(null)
      return
    }

    const isDealbreaker = itemToDelete.attributes.columnId === 2
    const type = isDealbreaker ? 'dealbreaker' : 'flag'

    // Close the modal first for better UX
    setDeleteModalVisible(false)
    setItemToDelete(null)

    // Delete the item using our central function
    removeItemFromAllProfiles(rowId, type)

    // Show success message
    showToast('success', `Item deleted from all profiles`)

    // Force a complete UI refresh to ensure deleted item disappears
    setList(null)
    setIsRemount(true)

    // Give state update time to complete, then refresh the board
    setTimeout(() => {
      // Only try to update the board if we still have a valid state
      if (dealbreaker && currentProfile && dealbreaker[currentProfile]) {
        updateBoard()
      }

      setIsRemount(false)
      setRefreshKey(Date.now())

      // Force a navigation update to ensure state is current everywhere
      if (navigation && navigation.setParams) {
        navigation.setParams({ forceRefresh: Date.now() })
      }
    }, 300)
  }

  // Add useFocusEffect to reset and refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Lists screen focused - refreshing state')

      // Ensure the current profile exists
      if (ensureCurrentProfileExists()) {
        // If we had to create the profile, wait for state update
        setTimeout(() => updateBoard(), 300)
        return
      }

      // Force UI refresh on screen focus
      setRefreshKey(Date.now())

      // Check if we have items to show
      const hasItems =
        dealbreaker?.[currentProfile]?.flag?.length > 0 ||
        dealbreaker?.[currentProfile]?.dealbreaker?.length > 0

      if (!hasItems) {
        // No items - show empty state
        setList(null)
      } else if (!list) {
        // Has items but no list - update board
        updateBoard()
      }

      return () => {
        // Clean up when screen is unfocused
      }
    }, [currentProfile, dealbreaker]) // Include both in dependencies for proper updates
  )

  return (
    <View style={styles.container}>
      <SwitchProfileModal visible={visible} onClose={() => setVisible(false)} />
      <ConfirmationModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false)
          setItemToDelete(null)
        }}
        onConfirm={confirmDeleteItem}
        title='Delete Item'
        message='This will delete the item from all profiles. Are you sure you want to delete it?'
      />

      <View>
        {list &&
        !isRemount &&
        dealbreaker?.[currentProfile] &&
        (dealbreaker[currentProfile]?.flag?.length > 0 ||
          dealbreaker[currentProfile]?.dealbreaker?.length > 0) ? (
          <View>
            <View style={styles.profileButtonContainer}>
              <View style={styles.innerProfileButtonContainer}>
                <AppButton
                  title={`Switch Profile`}
                  onPress={() => {
                    setVisible(true)
                  }}
                />
                <Text style={styles.profileText}>{currentProfile}</Text>
              </View>
            </View>
            <Board
              key={`board-${currentProfile}-${refreshKey}`}
              boardRepository={list}
              open={() => {}}
              onFlagClicked={(newFlag, item) => {
                if (!dealbreaker?.[currentProfile]?.flag) return

                const { flag } = dealbreaker[currentProfile]
                const newFlags = JSON.parse(JSON.stringify(flag))
                const rowId = item.attributes.row.id
                console.log('newFlag', newFlag)
                const flagItem = newFlags.find(flag => flag.id === rowId)
                if (flagItem) {
                  flagItem.flag = newFlag
                  setDealbreaker({
                    ...dealbreaker,
                    [currentProfile]: {
                      ...dealbreaker[currentProfile],
                      flag: newFlags
                    }
                  })
                }
                console.log('this is my flag', flag)
              }}
              onDragEnd={(boardItemOne, boardItemTwo, draggedItem) => {
                if (!dealbreaker?.[currentProfile]) return

                let isDealbreaker = false
                if (draggedItem.attributes.columnId === 2) {
                  isDealbreaker = true
                }
                let oldIndex = flagListIndexRef.current.get(
                  draggedItem.attributes.row.id
                )
                console.log('oldIndex: ', oldIndex)
                console.log('draggedItem: ', draggedItem.attributes.row.id)
                if (!oldIndex && oldIndex !== 0) {
                  oldIndex = dealbreakerListIndexRef.current.get(
                    draggedItem.attributes.row.id
                  )
                }
                updateListOrder(
                  draggedItem.attributes.index,
                  oldIndex,
                  draggedItem.attributes.row.id,
                  isDealbreaker
                )
              }}
              onDeleteItem={handleDeleteItem}
              isWithCountBadge={false}
              cardNameTextColor='white'
            />
          </View>
        ) : (
          <View style={styles.noDealbreakerContainer}>
            <View style={styles.noDealbreakerInContainer}>
              <Text style={styles.noDealbreakerText}>
                {isRemount ? 'Updating...' : 'No Flags Yet'}
              </Text>
              {!isRemount && (
                <AppButton
                  title='Create Flag'
                  onPress={() => {
                    navigation.navigate('Create Flag')
                  }}
                />
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noDealbreakerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  noDealbreakerInContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  noDealbreakerText: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  profileButtonContainer: {
    flex: 0.7,
    marginTop: 10,
    width: 200,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileText: {
    fontSize: 16,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center'
  },
  innerProfileButtonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  }
})
