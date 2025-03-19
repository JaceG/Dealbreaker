import { StatusBar } from 'expo-status-bar'
import { useState, useContext, useEffect, useRef, useCallback } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Button,
  TouchableOpacity
} from 'react-native'
import { Board, BoardRepository } from '../../libs/board/components'
import StoreContext from '../../store'
import AppButton from '../../components/AppButton'
import SwitchProfileModal from '../../components/SwitchProfileModal'
import ConfirmationModal from '../../components/ConfirmationModal'
import EditItemModal from '../../components/EditItemModal'
import EditProfileModal from '../../components/EditProfileModal'
import DealbreakerAlert from '../../components/DealbreakerAlert'
import FlagHistoryModal from '../../components/FlagHistoryModal'
import ReasonInputModal from '../../components/ReasonInputModal'
import { showToast } from '../../utils/functions'
import { useFocusEffect } from '@react-navigation/native'
import { addFlagHistory } from '../../utils/mongodb'

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
    profile,
    renameProfile,
    removeItemFromAllProfiles,
    isOnline,
    syncData
  } = useContext(StoreContext)
  const [visible, setVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [itemToEdit, setItemToEdit] = useState(null)
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false)
  const flagListIndexRef = useRef(new Map())
  const skipUpdateRef = useRef(false)
  const dealbreakerListIndexRef = useRef(new Map())
  const isMountRef = useRef(false)
  const [isRemount, setIsRemount] = useState(false)
  const [refreshKey, setRefreshKey] = useState(Date.now())

  // New state for dealbreaker alert
  const [dealbreakerAlertVisible, setDealbreakerAlertVisible] = useState(false)
  const [transitionedItem, setTransitionedItem] = useState(null)

  // Add new state for flag history modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [selectedFlag, setSelectedFlag] = useState(null)

  // Add new state for reason input modal
  const [reasonModalVisible, setReasonModalVisible] = useState(false)
  const [pendingFlagChange, setPendingFlagChange] = useState(null)

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
        flag: item.flag,
        onLongPress: () => handleViewFlagHistory(item)
      }
    })

    // Map dealbreakers to board rows
    newData[1].rows = cleanDealbreakers.map((item, index) => {
      dealbreakerListIndexRef.current.set(item.id, index)
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag,
        onLongPress: () => handleViewFlagHistory(item)
      }
    })

    // Set the board with the processed data
    setList(new BoardRepository(newData))
  }
  const updateListOrder = (newIndex, oldIndex, id, isDealbreaker) => {
    // Safety check
    if (!dealbreaker?.[currentProfile]) return

    // Create a deep copy of the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Get references to the current profile's lists
    const flagsList = updatedDealbreaker[currentProfile].flag || []
    const dealbreakersList =
      updatedDealbreaker[currentProfile].dealbreaker || []

    let movedItem = null

    // Case 1: Moving within the same list (reordering)
    if (
      (isDealbreaker &&
        dealbreakerListIndexRef.current.get(id) !== undefined) ||
      (!isDealbreaker && flagListIndexRef.current.get(id) !== undefined)
    ) {
      // Get the source list
      const sourceList = isDealbreaker ? dealbreakersList : flagsList

      // Find the item to move
      if (oldIndex >= 0 && oldIndex < sourceList.length) {
        movedItem = { ...sourceList[oldIndex] }
        // Remove from current position
        sourceList.splice(oldIndex, 1)
        // Insert at new position
        sourceList.splice(newIndex, 0, movedItem)
      }
    }
    // Case 2: Moving from flags to dealbreakers
    else if (isDealbreaker) {
      // Find the item in the flags list
      if (oldIndex >= 0 && oldIndex < flagsList.length) {
        movedItem = { ...flagsList[oldIndex] }
        // Remove from flags list
        flagsList.splice(oldIndex, 1)
        // Add to dealbreakers list at the specified position
        dealbreakersList.splice(newIndex, 0, movedItem)
      }
    }
    // Case 3: Moving from dealbreakers to flags
    else {
      // Find the item in the dealbreakers list
      if (oldIndex >= 0 && oldIndex < dealbreakersList.length) {
        movedItem = { ...dealbreakersList[oldIndex] }
        // Remove from dealbreakers list
        dealbreakersList.splice(oldIndex, 1)

        // Check if this item is a dealbreaker on the main profile
        if (
          currentProfile !== 'main' &&
          isItemOnMainDealbreakerList(movedItem.id)
        ) {
          // Make the flag yellow when it's a dealbreaker on main profile
          movedItem.flag = 'yellow'
        } else {
          // Otherwise, reset to a white flag
          movedItem.flag = 'white'
        }

        // Add to flags list at the specified position
        flagsList.splice(newIndex, 0, movedItem)
      }
    }

    // Safety check - if we didn't move anything, exit
    if (!movedItem) return

    // Update the state with the modified lists
    updatedDealbreaker[currentProfile].flag = flagsList
    updatedDealbreaker[currentProfile].dealbreaker = dealbreakersList

    // Set the updated state
    setDealbreaker(updatedDealbreaker)

    // Force a complete UI refresh to ensure changes are visible
    setIsRemount(true)
    setTimeout(() => {
      setIsRemount(false)
      setList(null)
      updateBoard()
      setRefreshKey(Date.now())

      // Force a navigation update to ensure state is current everywhere
      if (navigation && navigation.setParams) {
        navigation.setParams({ forceRefresh: Date.now() })
      }
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

  const handleEditItem = item => {
    // Extract the raw item data from the board item
    if (item && item.attributes && item.attributes.row) {
      const rowData = item.attributes.row
      // Find the actual item in the dealbreaker state
      const isDealbreaker = item.attributes.columnId === 2
      const type = isDealbreaker ? 'dealbreaker' : 'flag'

      const items = dealbreaker[currentProfile][type]
      const foundItem = items.find(i => i.id === rowData.id)

      if (foundItem) {
        setItemToEdit(foundItem)
        setEditModalVisible(true)
      } else {
        showToast('error', 'Item not found')
      }
    }
  }

  // Check if we need to add the handleSaveEdit function if it's missing
  const handleSaveEdit = updatedItem => {
    if (!updatedItem || !updatedItem.id) return

    // Determine the type (flag or dealbreaker)
    const isFlagItem = dealbreaker[currentProfile].flag.some(
      item => item.id === updatedItem.id
    )
    const type = isFlagItem ? 'flag' : 'dealbreaker'

    // Create a copy of the dealbreaker state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Update the item in all profiles
    Object.keys(updatedDealbreaker).forEach(profileName => {
      if (
        updatedDealbreaker[profileName] &&
        updatedDealbreaker[profileName][type]
      ) {
        updatedDealbreaker[profileName][type] = updatedDealbreaker[profileName][
          type
        ].map(item => {
          if (item.id === updatedItem.id) {
            return {
              ...item,
              title: updatedItem.title,
              description: updatedItem.description
            }
          }
          return item
        })
      }
    })

    // Update the state
    setDealbreaker(updatedDealbreaker)

    // Close the modal
    setEditModalVisible(false)
    setItemToEdit(null)

    // Show a success message
    showToast('success', 'Item updated successfully')

    // Force UI update
    setRefreshKey(Date.now())
  }

  // Handle profile edit button click
  const handleEditProfile = () => {
    // Don't allow editing main profile
    if (currentProfile === 'main') {
      showToast('error', 'The main profile cannot be renamed')
      return
    }

    setEditProfileModalVisible(true)
  }

  // Handle saving edited profile name
  const handleSaveProfileEdit = (oldName, newName) => {
    // Close edit modal
    setEditProfileModalVisible(false)

    // Rename the profile
    const success = renameProfile(oldName, newName)

    if (success) {
      // Show success message
      showToast('success', `Profile renamed to "${newName}" successfully`)

      // Force UI refresh
      setRefreshKey(Date.now())
    } else {
      // Show error message
      showToast('error', 'Failed to rename profile. Please try again.')
    }
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

  // Check if an item is on the main profile's dealbreaker list
  const isItemOnMainDealbreakerList = itemId => {
    if (!dealbreaker?.main?.dealbreaker) return false

    return dealbreaker.main.dealbreaker.some(item => item.id === itemId)
  }

  // Function to handle viewing flag history
  const handleViewFlagHistory = item => {
    console.log('Viewing history for flag:', item)
    setSelectedFlag(item)
    setHistoryModalVisible(true)
  }

  // Modify the flag click handler to prompt for reason
  const handleFlagClick = (newFlag, item) => {
    // If not current profile or item data is missing, exit early
    if (!dealbreaker?.[currentProfile]?.flag || !item?.attributes?.row) return

    const rowId = item.attributes.row.id
    const flagsList = dealbreaker[currentProfile].flag

    // Get the current flag item to determine previous status
    const existingFlags = JSON.parse(JSON.stringify(flagsList))
    const flagItem = existingFlags.find(flag => flag.id === rowId)

    if (!flagItem) return

    // Save the previous status
    const previousStatus = flagItem.flag || 'white'

    // Only prompt for reason if the status is actually changing
    if (previousStatus !== newFlag) {
      // Store the pending change
      setPendingFlagChange({
        item,
        rowId,
        previousStatus,
        newFlag
      })

      // Show reason input modal
      setReasonModalVisible(true)
    }
  }

  // Handle completing the flag change after getting reason
  const handleFlagChangeWithReason = async reason => {
    // Close the reason modal
    setReasonModalVisible(false)

    if (!pendingFlagChange) return

    const { item, rowId, previousStatus, newFlag } = pendingFlagChange

    try {
      // Record the flag status change in history
      await addFlagHistory(
        currentProfile,
        rowId,
        item.attributes.row.title,
        previousStatus,
        newFlag,
        reason
      )

      // Now proceed with the actual flag change
      const flagsList = dealbreaker[currentProfile].flag
      const newFlags = JSON.parse(JSON.stringify(flagsList))
      const updatedFlagItem = newFlags.find(flag => flag.id === rowId)

      if (!updatedFlagItem) return

      // Check if this should auto-transition to dealbreaker
      if (
        newFlag === 'red' &&
        currentProfile !== 'main' &&
        isItemOnMainDealbreakerList(rowId)
      ) {
        // This is a match for auto-transition!
        console.log(
          'Auto-transitioning item to dealbreaker:',
          item.attributes.row.title
        )

        // Move the item from flag list to dealbreaker list
        const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

        // Remove item from flags list
        updatedDealbreaker[currentProfile].flag = updatedDealbreaker[
          currentProfile
        ].flag.filter(f => f.id !== rowId)

        // Add item to dealbreakers list
        updatedDealbreaker[currentProfile].dealbreaker = [
          ...updatedDealbreaker[currentProfile].dealbreaker,
          { ...updatedFlagItem, flag: newFlag }
        ]

        // Update state
        setDealbreaker(updatedDealbreaker)

        // Store the transitioned item for potential undo
        setTransitionedItem(updatedFlagItem)

        // Show the alert
        setDealbreakerAlertVisible(true)
      } else {
        // Regular flag update (no transition)
        updatedFlagItem.flag = newFlag
        setDealbreaker({
          ...dealbreaker,
          [currentProfile]: {
            ...dealbreaker[currentProfile],
            flag: newFlags
          }
        })
      }
    } catch (error) {
      console.error('Error updating flag with reason:', error)
      showToast('error', 'Failed to update flag status')
    } finally {
      // Clear pending flag change
      setPendingFlagChange(null)
    }
  }

  // Handle cancelling the flag change
  const handleCancelFlagChange = () => {
    setReasonModalVisible(false)
    setPendingFlagChange(null)
  }

  // Keep the existing handleUndoTransition function
  const handleUndoTransition = () => {
    if (!transitionedItem) return

    // Copy the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Remove the item from dealbreaker list
    updatedDealbreaker[currentProfile].dealbreaker = updatedDealbreaker[
      currentProfile
    ].dealbreaker.filter(item => item.id !== transitionedItem.id)

    // Determine the flag color - yellow if it's a dealbreaker on main profile
    const flagColor = isItemOnMainDealbreakerList(transitionedItem.id)
      ? 'yellow'
      : 'white'

    // Add the item back to flag list with appropriate flag color
    updatedDealbreaker[currentProfile].flag = [
      ...updatedDealbreaker[currentProfile].flag,
      { ...transitionedItem, flag: flagColor }
    ]

    // Update state
    setDealbreaker(updatedDealbreaker)

    // Close the alert
    setDealbreakerAlertVisible(false)
    setTransitionedItem(null)

    // Show feedback
    showToast('success', 'Transition undone. Item moved back to flags list.')

    // Force a complete UI refresh
    setIsRemount(true)
    setTimeout(() => {
      setIsRemount(false)
      setList(null)
      updateBoard()
      setRefreshKey(Date.now())

      // Force navigation update
      if (navigation && navigation.setParams) {
        navigation.setParams({ forceRefresh: Date.now() })
      }
    }, 300)
  }

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
      <EditItemModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false)
          setItemToEdit(null)
        }}
        onSave={handleSaveEdit}
        item={itemToEdit}
      />
      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
        onSave={handleSaveProfileEdit}
        profileName={currentProfile}
        existingProfiles={profile}
      />
      <DealbreakerAlert
        visible={dealbreakerAlertVisible}
        onClose={() => {
          setDealbreakerAlertVisible(false)
          setTransitionedItem(null)
        }}
        onUndo={handleUndoTransition}
        itemTitle={transitionedItem?.title || ''}
      />
      <FlagHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        profileId={currentProfile}
        flagId={selectedFlag?.id}
        flagTitle={selectedFlag?.title}
      />
      {pendingFlagChange && (
        <ReasonInputModal
          visible={reasonModalVisible}
          onClose={handleCancelFlagChange}
          onSubmit={handleFlagChangeWithReason}
          flagTitle={pendingFlagChange.item?.attributes?.row?.title || ''}
          prevStatus={pendingFlagChange.previousStatus}
          newStatus={pendingFlagChange.newFlag}
        />
      )}

      <View>
        {list &&
        !isRemount &&
        dealbreaker?.[currentProfile] &&
        (dealbreaker[currentProfile]?.flag?.length > 0 ||
          dealbreaker[currentProfile]?.dealbreaker?.length > 0) ? (
          <View>
            <View style={styles.profileButtonContainer}>
              <View style={styles.innerProfileButtonContainer}>
                <View style={styles.buttonRow}>
                  <AppButton
                    title={`Switch Profile`}
                    onPress={() => {
                      setVisible(true)
                    }}
                  />
                  {isOnline && (
                    <AppButton
                      title='Sync'
                      onPress={() => {
                        if (syncData) {
                          syncData()
                          showToast('info', 'Syncing with cloud...')
                        }
                      }}
                    />
                  )}
                </View>
                <Text style={styles.profileText}>
                  {currentProfile}
                  {currentProfile !== 'main' && (
                    <TouchableOpacity
                      style={styles.editProfileButton}
                      onPress={handleEditProfile}>
                      <Text style={styles.editProfileButtonText}> ✏️</Text>
                    </TouchableOpacity>
                  )}
                </Text>
              </View>
            </View>
            <Board
              key={`board-${currentProfile}-${refreshKey}`}
              boardRepository={list}
              open={() => {}}
              onFlagClicked={handleFlagClick}
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

                // Force a complete UI refresh after drag operation
                setTimeout(() => {
                  setRefreshKey(Date.now())
                }, 50)
              }}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
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
    width: 300, // Increased from 200 to accommodate both buttons
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
  innerProfileButtonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  profileText: {
    fontSize: 16,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center'
  },
  editProfileButton: {
    padding: 2
  },
  editProfileButtonText: {
    fontSize: 16
  }
})
