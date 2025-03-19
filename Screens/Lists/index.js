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
import { addFlagHistory, addAttachmentToHistory } from '../../utils/mongodb'

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
    setDealbreaker,
    currentProfileId,
    profiles,
    ensureProfileExists,
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

  // Create a reference to track if an operation is a user drag
  const isDragOperationRef = useRef(false)

  // Add state for additional reason modal
  const [additionalReasonModalVisible, setAdditionalReasonModalVisible] =
    useState(false)

  // Add this debug function to help track what's happening with flag colors
  const logProfileFlags = label => {
    if (!dealbreaker || !currentProfileId || !dealbreaker[currentProfileId])
      return

    console.log(`--- ${label} ---`)
    console.log(`Current Profile: ${currentProfileId}`)

    if (
      dealbreaker[currentProfileId].flag &&
      dealbreaker[currentProfileId].flag.length > 0
    ) {
      console.log(
        'Flags:',
        dealbreaker[currentProfileId].flag.map(
          f => `${f.title} - ${f.flag || 'white'}`
        )
      )
    }
  }

  useEffect(() => {
    // Log flag colors whenever currentProfileId changes
    logProfileFlags(`Profile changed to ${currentProfileId}`)
  }, [currentProfileId])

  // Modify this effect to log flags after dealbreaker state updates
  useEffect(() => {
    logProfileFlags('Dealbreaker state updated')
    reloadBoard()
  }, [dealbreaker])

  // Helper function to ensure current profile exists
  const ensureCurrentProfileExists = () => {
    // Safety checks for initial render
    if (!dealbreaker) return false
    if (!currentProfileId) return false

    // Check if the profile already exists
    if (dealbreaker[currentProfileId]) return false

    console.log('Creating missing profile in Lists:', currentProfileId)

    // Use the store's ensureProfileExists function
    return ensureProfileExists(currentProfileId)
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
  }, [currentProfileId])

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
    if (dealbreaker?.[currentProfileId]) {
      const hasItems =
        dealbreaker[currentProfileId].flag?.length > 0 ||
        dealbreaker[currentProfileId].dealbreaker?.length > 0

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
    currentProfileId,
    dealbreaker
  ])

  const reloadBoard = () => {
    // Check if we have items to display
    const hasItems =
      dealbreaker?.[currentProfileId]?.flag?.length > 0 ||
      dealbreaker?.[currentProfileId]?.dealbreaker?.length > 0

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
    if (!dealbreaker[currentProfileId]) {
      ensureCurrentProfileExists()
      return
    }

    // Get data from current profile with defaults for safety
    const { flag = [], dealbreaker: dealbreakerList = [] } =
      dealbreaker[currentProfileId]

    // Add logging to track flag colors
    console.log(
      `Profile ${currentProfileId} flag colors:`,
      flag.map(f => ({ id: f.id, title: f.title, flag: f.flag }))
    )

    // Filter out any invalid items
    const cleanFlag = flag.filter(item => item && item.id)
    const cleanDealbreakers = dealbreakerList.filter(item => item && item.id)

    // Create a fresh board data structure
    const newData = JSON.parse(JSON.stringify(data))
    flagListIndexRef.current = new Map()
    dealbreakerListIndexRef.current = new Map()

    // Map flags to board rows while preserving the original flag colors
    newData[0].rows = cleanFlag.map((item, index) => {
      flagListIndexRef.current.set(item.id, index)

      // Create a row object with the original flag value
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag || 'white', // Preserve the original flag color but default to white if missing
        // Make viewHistory a direct property instead
        onLongPress: () => handleViewFlagHistory(item) // The board component will expose this through item.row().onLongPress
      }
    })

    // Map dealbreakers to board rows
    newData[1].rows = cleanDealbreakers.map((item, index) => {
      dealbreakerListIndexRef.current.set(item.id, index)
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag || 'white', // Preserve the original flag color but default to white if missing
        // Make viewHistory a direct property instead
        onLongPress: () => handleViewFlagHistory(item) // The board component will expose this through item.row().onLongPress
      }
    })

    // Set the board with the processed data
    setList(new BoardRepository(newData))
  }

  const updateListOrder = (newIndex, oldIndex, id, isDealbreaker) => {
    // Safety check
    if (!dealbreaker?.[currentProfileId]) return

    // Set flag to indicate this is a user-initiated drag operation
    const isDragOperation = isDragOperationRef.current
    // Reset the flag for next time
    isDragOperationRef.current = false

    // Log before making changes
    logProfileFlags('Before updateListOrder')

    // Create a deep copy of the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Get references to the current profile's lists
    const flagsList = updatedDealbreaker[currentProfileId].flag || []
    const dealbreakersList =
      updatedDealbreaker[currentProfileId].dealbreaker || []

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

        // IMPORTANT FIX: Only reset the flag if it's actually being moved by the user
        // and not during a profile switch or other automatic operation.
        // We'll detect this by checking if we were triggered by a real drag operation
        if (isDragOperation) {
          // Check if this item is a dealbreaker on the main profile
          if (
            currentProfileId !== 'main' &&
            isItemOnMainDealbreakerList(movedItem.id)
          ) {
            // Make the flag yellow when it's a dealbreaker on main profile
            movedItem.flag = 'yellow'
          } else {
            // Otherwise, reset to a white flag
            movedItem.flag = 'white'
          }
        }
        // Keep the original flag color if this is not a user-initiated drag

        // Add to flags list at the specified position
        flagsList.splice(newIndex, 0, movedItem)
      }
    }

    // Safety check - if we didn't move anything, exit
    if (!movedItem) return

    // Update the state with the modified lists
    updatedDealbreaker[currentProfileId].flag = flagsList
    updatedDealbreaker[currentProfileId].dealbreaker = dealbreakersList

    // Log after making changes
    console.log(
      'After updateListOrder - about to update state with:',
      updatedDealbreaker[currentProfileId].flag.map(
        f => `${f.title} - ${f.flag || 'white'}`
      )
    )

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
  console.log('flag: ', dealbreaker?.[currentProfileId]?.flag || [])
  console.log(
    'dealbreaker: ',
    dealbreaker?.[currentProfileId]?.dealbreaker || []
  )

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
      if (dealbreaker && currentProfileId && dealbreaker[currentProfileId]) {
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

      const items = dealbreaker[currentProfileId][type]
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
    const isFlagItem = dealbreaker[currentProfileId].flag.some(
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
    if (currentProfileId === 'main') {
      showToast('error', 'The main profile cannot be renamed')
      return
    }

    setEditProfileModalVisible(true)
  }

  // Handle save profile edit
  const handleSaveProfileEdit = (profileId, newName) => {
    // Call the store context function to rename the profile
    const success = renameProfile(profileId, newName)

    if (success) {
      showToast('success', 'Profile renamed successfully')

      // Find the updated profile name to display
      const updatedProfile = profiles.find(p => p.id === profileId)
      if (updatedProfile) {
        console.log(`Profile renamed: ${profileId} -> ${updatedProfile.name}`)
      }

      // Force a UI refresh
      setRefreshKey(Date.now())
    } else {
      showToast('error', 'Failed to rename profile')
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
        dealbreaker?.[currentProfileId]?.flag?.length > 0 ||
        dealbreaker?.[currentProfileId]?.dealbreaker?.length > 0

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
    }, [currentProfileId, dealbreaker]) // Include both in dependencies for proper updates
  )

  // Check if an item is on the main profile's dealbreaker list
  const isItemOnMainDealbreakerList = itemId => {
    if (!dealbreaker?.main?.dealbreaker) return false

    return dealbreaker.main.dealbreaker.some(item => item.id === itemId)
  }

  // Function to handle viewing flag history
  const handleViewFlagHistory = item => {
    console.log('handleViewFlagHistory called with item:', item)

    // Extract the actual data from the board item if needed
    let flagData = item

    // Check if this is a board item with attributes structure
    if (item && item.attributes && item.attributes.row) {
      console.log('Converting board item to flag data')
      // Extract the row data which has the id, name, etc.
      const rowData = item.attributes.row

      // Determine if it's a flag or dealbreaker
      const isDealbreaker = item.attributes.columnId === 2
      const type = isDealbreaker ? 'dealbreaker' : 'flag'

      // Find the complete item data in the current profile's state
      const items = dealbreaker[currentProfileId][type] || []
      flagData = items.find(i => i.id === rowData.id) || rowData
    }

    // Log what we're about to set
    console.log('Setting selectedFlag to:', flagData)

    // Set the flag data first
    setSelectedFlag(flagData)

    // Then immediately set the modal to visible
    setHistoryModalVisible(true)

    console.log('Modal should now be visible')
  }

  // Modify the flag click handler to immediately apply changes and then prompt for reason
  const handleFlagClick = (newFlag, item) => {
    // If not current profile or item data is missing, exit early
    if (!dealbreaker?.[currentProfileId]?.flag || !item?.attributes?.row) return

    const rowId = item.attributes.row.id
    const flagsList = dealbreaker[currentProfileId].flag

    // Get the current flag item to determine previous status
    const existingFlags = JSON.parse(JSON.stringify(flagsList))
    const flagItem = existingFlags.find(flag => flag.id === rowId)

    if (!flagItem) return

    // Save the previous status
    const previousStatus = flagItem.flag || 'white'

    // If status isn't changing, just exit
    if (previousStatus === newFlag) return

    // IMPORTANT: Apply the flag change IMMEDIATELY to the state so it persists
    // even if the user cancels entering a reason
    const updatedFlagsList = flagsList.map(flag =>
      flag.id === rowId ? { ...flag, flag: newFlag } : flag
    )

    setDealbreaker({
      ...dealbreaker,
      [currentProfileId]: {
        ...dealbreaker[currentProfileId],
        flag: updatedFlagsList
      }
    })

    // Now store the change details and prompt for reason to record history
    setPendingFlagChange({
      item,
      rowId,
      previousStatus,
      newFlag
    })

    // Show reason input modal
    setReasonModalVisible(true)
  }

  // Handle completing the flag change after getting reason - only for history recording now
  const handleFlagChangeWithReason = async (reason, attachments = []) => {
    // Close the reason modal
    setReasonModalVisible(false)

    if (!pendingFlagChange) return

    const { item, rowId, previousStatus, newFlag } = pendingFlagChange

    try {
      // Get the current profile name
      const currentProfile = profiles.find(p => p.id === currentProfileId)
      if (!currentProfile) {
        showToast('error', 'Current profile not found')
        return
      }

      // Record the flag status change in history with profile name
      const historyEntry = await addFlagHistory(
        currentProfileId,
        rowId,
        item.attributes.row.name, // Use name instead of title to match the board data structure
        previousStatus,
        newFlag,
        reason,
        currentProfile.name // Add profile name to history
      )

      // Add attachments if any were provided
      if (
        attachments &&
        attachments.length > 0 &&
        historyEntry &&
        historyEntry._id
      ) {
        console.log('Adding attachments to history entry:', attachments)

        // Process each attachment
        for (const attachment of attachments) {
          try {
            await addAttachmentToHistory(historyEntry._id, attachment)
          } catch (attachError) {
            console.error('Error adding attachment:', attachError)
          }
        }
      }

      // Check if this should auto-transition to dealbreaker
      if (
        newFlag === 'red' &&
        currentProfileId !== 'main' &&
        isItemOnMainDealbreakerList(rowId)
      ) {
        // This is a match for auto-transition!
        console.log(
          'Auto-transitioning item to dealbreaker:',
          item.attributes.row.title
        )

        // Move the item from flag list to dealbreaker list
        const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

        // Find the updated item (that already has the new flag color)
        const updatedFlagItem = updatedDealbreaker[currentProfileId].flag.find(
          f => f.id === rowId
        )

        if (!updatedFlagItem) return

        // Remove item from flags list
        updatedDealbreaker[currentProfileId].flag = updatedDealbreaker[
          currentProfileId
        ].flag.filter(f => f.id !== rowId)

        // Add item to dealbreakers list
        updatedDealbreaker[currentProfileId].dealbreaker = [
          ...updatedDealbreaker[currentProfileId].dealbreaker,
          updatedFlagItem
        ]

        // Update state
        setDealbreaker(updatedDealbreaker)

        // Store the transitioned item for potential undo
        setTransitionedItem(updatedFlagItem)

        // Show the alert
        setDealbreakerAlertVisible(true)
      }
    } catch (error) {
      console.error('Error updating flag history with reason:', error)
      showToast('error', 'Flag updated but failed to record history')
    } finally {
      // Clear pending flag change
      setPendingFlagChange(null)
    }
  }

  // Handle cancelling the flag change - now just cancels history recording
  const handleCancelFlagChange = () => {
    setReasonModalVisible(false)
    setPendingFlagChange(null)

    // Note: The flag change itself has already been applied to the state,
    // we're just not recording the history entry
  }

  // Keep the existing handleUndoTransition function
  const handleUndoTransition = () => {
    if (!transitionedItem) return

    // Copy the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker))

    // Remove the item from dealbreaker list
    updatedDealbreaker[currentProfileId].dealbreaker = updatedDealbreaker[
      currentProfileId
    ].dealbreaker.filter(item => item.id !== transitionedItem.id)

    // Determine the flag color - yellow if it's a dealbreaker on main profile
    const flagColor = isItemOnMainDealbreakerList(transitionedItem.id)
      ? 'yellow'
      : 'white'

    // Add the item back to flag list with appropriate flag color
    updatedDealbreaker[currentProfileId].flag = [
      ...updatedDealbreaker[currentProfileId].flag,
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

  // Get current profile name
  const getCurrentProfileName = () => {
    const profile = profiles.find(p => p.id === currentProfileId)
    return profile ? profile.name : currentProfileId
  }

  // Add this function to check modal state visibility
  const debugModalState = () => {
    console.log('MODAL STATE CHECK:')
    console.log('- additionalReasonModalVisible:', additionalReasonModalVisible)
    console.log('- selectedFlag:', !!selectedFlag)
    console.log('- historyModalVisible:', historyModalVisible)
  }

  // Handler for adding additional reasons to flag history
  const handleAddAdditionalReason = async (reason, attachments = []) => {
    console.log('handleAddAdditionalReason called with reason:', reason)
    console.log('Attachments:', attachments)

    // Close the modal first for better UX
    setAdditionalReasonModalVisible(false)

    // Debug state
    debugModalState()

    if (!selectedFlag || !reason.trim()) {
      console.log('Early return: selectedFlag or reason missing', {
        selectedFlag: !!selectedFlag,
        reasonEmpty: !reason.trim()
      })
      return
    }

    try {
      // Get current profile name
      const currentProfile = profiles.find(p => p.id === currentProfileId)
      if (!currentProfile) {
        showToast('error', 'Current profile not found')
        return
      }

      // Get current flag status
      const status = selectedFlag.flag || 'white'

      // Show loading toast
      showToast('info', 'Saving additional reason...')

      // Add to flag history - using same status for previous and new
      // This indicates it's just an additional reason, not a color change
      const historyEntry = await addFlagHistory(
        currentProfileId,
        selectedFlag.id,
        selectedFlag.title || selectedFlag.name,
        status, // Same status for previous
        status, // Same status for new (no change)
        reason,
        currentProfile.name
      )

      // Add attachments if any were provided
      if (
        attachments &&
        attachments.length > 0 &&
        historyEntry &&
        historyEntry._id
      ) {
        console.log('Adding attachments to history entry:', attachments)

        // Process each attachment
        for (const attachment of attachments) {
          try {
            await addAttachmentToHistory(historyEntry._id, attachment)
          } catch (attachError) {
            console.error('Error adding attachment:', attachError)
          }
        }
      }

      showToast('success', 'Reason added to history')

      // Reopen the history modal after a short delay
      setTimeout(() => {
        setHistoryModalVisible(true)
      }, 300)
    } catch (error) {
      console.error('Error adding additional reason:', error)
      showToast('error', 'Failed to add reason to history')
    }
  }

  // Modify onAddReason handler to add debugging
  const handleOpenAddReasonModal = () => {
    console.log('Opening add reason modal. selectedFlag:', selectedFlag)

    // Close the history modal first
    setHistoryModalVisible(false)

    // Add a delay to ensure the history modal closes completely before opening the reason modal
    setTimeout(() => {
      // Now open the reason modal
      setAdditionalReasonModalVisible(true)
      console.log('additionalReasonModalVisible set to true')

      // Add timeout to check if state was updated
      setTimeout(() => {
        debugModalState()
      }, 100)
    }, 300) // 300ms delay to allow modal animation to complete
  }

  return (
    <View style={styles.container}>
      <SwitchProfileModal visible={visible} onClose={() => setVisible(false)} />

      {/* Move the additional reason modal outside conditional rendering */}
      <ReasonInputModal
        visible={additionalReasonModalVisible}
        onClose={() => {
          console.log('Closing additional reason modal')
          setAdditionalReasonModalVisible(false)
        }}
        onSubmit={handleAddAdditionalReason}
        flagTitle={selectedFlag?.title || selectedFlag?.name || 'Flag'}
        prevStatus={selectedFlag?.flag || 'white'}
        newStatus={selectedFlag?.flag || 'white'}
        modalTitle='Add Additional Context'
      />

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
        profileId={currentProfileId}
        profileName={getCurrentProfileName()}
        existingProfiles={profiles}
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

      {/* Move the FlagHistoryModal to the very end so it renders on top of everything else */}
      {selectedFlag && (
        <FlagHistoryModal
          visible={historyModalVisible}
          onClose={() => {
            console.log('Closing history modal')
            setHistoryModalVisible(false)
          }}
          profileId={currentProfileId}
          flagId={selectedFlag?.id}
          flagTitle={selectedFlag?.title || selectedFlag?.name || ''}
          onAddReason={handleOpenAddReasonModal}
        />
      )}

      <View>
        {list &&
        !isRemount &&
        dealbreaker?.[currentProfileId] &&
        (dealbreaker[currentProfileId]?.flag?.length > 0 ||
          dealbreaker[currentProfileId]?.dealbreaker?.length > 0) ? (
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
                <View style={styles.profileSwitchTextContainer}>
                  <Text style={styles.profileLabel}>Profile: </Text>
                  <View style={styles.profileNameContainer}>
                    <Text style={styles.profileText}>
                      {getCurrentProfileName()}
                    </Text>
                    {currentProfileId !== 'main' && (
                      <TouchableOpacity
                        style={styles.editProfileButton}
                        onPress={handleEditProfile}>
                        <Text style={styles.editProfileText}>✏️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
            <Board
              key={`board-${currentProfileId}-${refreshKey}`}
              boardRepository={list}
              open={() => {}}
              onFlagClicked={handleFlagClick}
              onDragEnd={(boardItemOne, boardItemTwo, draggedItem) => {
                if (!dealbreaker?.[currentProfileId]) return

                // Set the flag to indicate this is a user drag operation
                isDragOperationRef.current = true

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
  profileSwitchTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 5
  },
  profileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  profileText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  editProfileButton: {
    marginLeft: 5
  },
  editProfileText: {
    fontSize: 16
  }
})
