import { StatusBar } from "expo-status-bar";
import { useState, useContext, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import { Board, BoardRepository } from "../../libs/board/components";
import StoreContext from "../../store";
import AppButton from "../../components/AppButton";
import SwitchProfileModal from "../../components/SwitchProfileModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import EditItemModal from "../../components/EditItemModal";
import EditProfileModal from "../../components/EditProfileModal";
import DealbreakerAlert from "../../components/DealbreakerAlert";
import FlagHistoryModal from "../../components/FlagHistoryModal";
import ReasonInputModal from "../../components/ReasonInputModal";
import { showToast } from "../../utils/functions";
import { useFocusEffect } from "@react-navigation/native";
import { addFlagHistory, addAttachmentToHistory } from "../../utils/mongodb";
import { useFlagContext } from "../../context/FlagContext";
import { useAuth } from "../../context/Auth";
import ReasonsCounterIcon from "../../components/ReasonsCounterIcon";
import FlagTimelineIcon from "../../components/FlagTimelineIcon";
import type React from "react";
import { router } from "expo-router";

// Types from app/_layout.tsx
interface FlagItem {
  id: string;
  [key: string]: any;
}

interface ProfileData {
  flag: FlagItem[];
  dealbreaker: FlagItem[];
}

interface DealbreakerState {
  main: ProfileData;
  [profileId: string]: ProfileData;
}

interface Profile {
  id: string;
  name: string;
}

// Modal/component prop types (fallback to any if not available)
type SwitchProfileModalProps = {
  visible: boolean;
  onClose: () => void;
};
type ConfirmationModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
};
type EditItemModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  item: any;
};
type EditProfileModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (profileId: string, newName: string) => void;
  profileId: string;
  profileName: string;
  existingProfiles: Profile[];
};
type DealbreakerAlertProps = {
  visible: boolean;
  onClose: () => void;
  onUndo: () => void;
  itemTitle: string;
};
type FlagHistoryModalProps = {
  visible: boolean;
  onClose: () => void;
  profileId: string;
  flagId: string;
  flagTitle: string;
  onAddReason: () => void;
};
type ReasonInputModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, attachments?: any[]) => void;
  flagTitle: string;
  prevStatus: string;
  newStatus: string;
  modalTitle: string;
};
type AppButtonProps = {
  title: string;
  onPress: () => void;
  color?: string;
};

const data = [
  {
    id: 1,
    name: "Flags",
    rows: [],
  },
  {
    id: 2,
    name: "Dealbreakers",
    rows: [],
  },
];

export default function Lists({
  navigation,
  route,
}: {
  navigation?: any;
  route?: any;
}) {
  let ScreenHeight = Dimensions.get("window").height - 150;
  // Explicitly type context hooks as any to avoid linter errors
  const {
    dealbreaker,
    setDealbreaker,
    currentProfileId,
    profiles,
    ensureProfileExists,
    renameProfile,
    removeItemFromAllProfiles,
    isOnline,
    syncData,
  } = useContext<any>(StoreContext);
  const {
    pendingFlagChange,
    reasonModalVisible,
    selectedFlag,
    historyModalVisible,
    additionalReasonModalVisible,
    handleFlagClick: contextHandleFlagClick,
    handleFlagChangeWithReason: contextHandleFlagChangeWithReason,
    handleCancelFlagChange,
    handleViewFlagHistory: contextHandleViewFlagHistory,
    handleOpenAddReasonModal,
    handleAddAdditionalReason: contextHandleAddAdditionalReason,
    setReasonModalVisible,
    setHistoryModalVisible,
    setAdditionalReasonModalVisible,
  } = useFlagContext() as any;
  const { user } = useAuth() as any;
  const [visible, setVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const flagListIndexRef = useRef<Map<string, number>>(new Map());
  const skipUpdateRef = useRef(false);
  const dealbreakerListIndexRef = useRef<Map<string, number>>(new Map());
  const isMountRef = useRef(false);
  const [isRemount, setIsRemount] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // New state for dealbreaker alert
  const [dealbreakerAlertVisible, setDealbreakerAlertVisible] = useState(false);
  const [transitionedItem, setTransitionedItem] = useState<any>(null);

  // New state for transition reason modal
  const [transitionReasonModalVisible, setTransitionReasonModalVisible] =
    useState(false);
  const [pendingTransition, setPendingTransition] = useState<any>(null);

  // Create a reference to track if an operation is a user drag
  const isDragOperationRef = useRef(false);

  // Add this debug function to help track what's happening with flag colors
  const logProfileFlags = (label: string) => {
    console.log(
      `${label} - Profile ${currentProfileId} flags:`,
      dealbreaker[currentProfileId]?.flag
    );
  };

  useEffect(() => {
    // Log flag colors whenever currentProfileId changes
    logProfileFlags(`Profile changed to ${currentProfileId}`);

    // Run duplicate cleanup when profile changes
    if (dealbreaker && currentProfileId && dealbreaker[currentProfileId]) {
      cleanupDuplicates();
    }
  }, [currentProfileId]);

  // Modify this effect to log flags after dealbreaker state updates
  useEffect(() => {
    logProfileFlags("Dealbreaker state updated");
    reloadBoard();
  }, [dealbreaker]);

  // Helper function to ensure current profile exists
  const ensureCurrentProfileExists = () => {
    // Safety checks for initial render
    if (!dealbreaker) return false;
    if (!currentProfileId) return false;

    // Check if the profile already exists
    if (dealbreaker[currentProfileId]) return false;

    console.log("Creating missing profile in Lists:", currentProfileId);

    // Use the store's ensureProfileExists function
    return ensureProfileExists(currentProfileId);
  };

  useEffect(() => {
    // Create the profile if it doesn't exist
    if (ensureCurrentProfileExists()) {
      // Don't continue with remount - let the state update trigger it
      return;
    }

    setIsRemount(true);
    setTimeout(() => {
      reloadBoard();
      setIsRemount(false);
    }, 1000);
  }, [currentProfileId]);
  useEffect(() => {
    setIsRemount(true);
    setTimeout(() => {
      reloadBoard();
      setIsRemount(false);
    }, 1000);
  }, []);
  // Handle navigation params for forced refreshes
  useEffect(() => {
    const params =
      route && route.params ? (route.params as { [key: string]: any }) : {};
    const hasRefreshParam = params.refresh || params.forceRefresh;

    if (!hasRefreshParam) return;

    console.log("Refreshing via navigation param", params);

    // Reset navigation params first to avoid loops
    const clearedParams: { [key: string]: any } = {};
    if (params.refresh) clearedParams.refresh = null;
    if (params.forceRefresh) clearedParams.forceRefresh = null;
    navigation && navigation.setParams && navigation.setParams(clearedParams);

    // Force UI refresh
    // setRefreshKey(Date.now());

    // Check if we have data to show
    if (dealbreaker?.[currentProfileId]) {
      const hasItems =
        dealbreaker[currentProfileId].flag?.length > 0 ||
        dealbreaker[currentProfileId].dealbreaker?.length > 0;

      if (hasItems) {
        // Has items - update board
        updateBoard();
      } else {
        // No items - show empty state
        setList(null);
      }
    }
  }, [
    route?.params?.refresh,
    route?.params?.forceRefresh,
    currentProfileId,
    dealbreaker,
  ]);

  const reloadBoard = () => {
    // Check if we have items to display
    const hasItems =
      dealbreaker?.[currentProfileId]?.flag?.length > 0 ||
      dealbreaker?.[currentProfileId]?.dealbreaker?.length > 0;

    // Only update board if we have items and required conditions are met
    if (hasItems && !skipUpdateRef.current && isMountRef.current) {
      console.log("updateBoard");
      // Small timeout to ensure state is current
      setTimeout(() => updateBoard(), 50);
    } else if (!hasItems && list) {
      // If we have no items but are showing a list, reset to empty state
      setList(null);
    } else {
      // Set defaults for next time
      skipUpdateRef.current = false;
      isMountRef.current = true;
    }
  };
  useEffect(() => {
    reloadBoard();
  }, [dealbreaker]);

  const updateBoard = (force: boolean = false, forceData: any = null) => {
    // Skip if requested
    if (!force && skipUpdateRef.current) {
      skipUpdateRef.current = false;
      return;
    }

    // Ensure the current profile exists
    if (!force && !dealbreaker[currentProfileId]) {
      ensureCurrentProfileExists();
      return;
    }

    let flag = [];
    let dealbreakerList = [];
    if (forceData) {
      // Get data from current profile with defaults for safety
      const { flag: newFlags = [], dealbreaker: newDealbreakerList = [] } =
        forceData[currentProfileId];
      flag = newFlags;
      dealbreakerList = newDealbreakerList;
    } else {
      // Get data from current profile with defaults for safety
      const { flag: newFlags = [], dealbreaker: newDealbreakerList = [] } =
        dealbreaker[currentProfileId];
      flag = newFlags;
      dealbreakerList = newDealbreakerList;
    }

    console.log("current flag", { flag });
    // Add logging to track flag colors
    console.log(
      `Profile ${currentProfileId} flag colors:`,
      flag.map((f: any) => ({ id: f.id, title: f.title, flag: f.flag }))
    );

    // Filter out any invalid items
    const cleanFlag = flag.filter((item: any) => item && item.id);
    const cleanDealbreakers = dealbreakerList.filter(
      (item: any) => item && item.id
    );

    // Create a fresh board data structure
    const newData = JSON.parse(JSON.stringify(data));
    flagListIndexRef.current = new Map();
    dealbreakerListIndexRef.current = new Map();

    // Map flags to board rows while preserving the original flag colors
    newData[0].rows = cleanFlag.map((item: any, index: number) => {
      flagListIndexRef.current.set(item.id, index);

      // Create a row object with the original flag value
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag || "white", // Preserve the original flag color but default to white if missing
        // Make viewHistory a direct property instead
        onLongPress: () => handleViewFlagHistory(item), // The board component will expose this through item.row().onLongPress
      };
    });

    // Map dealbreakers to board rows
    newData[1].rows = cleanDealbreakers.map((item: any, index: number) => {
      dealbreakerListIndexRef.current.set(item.id, index);
      return {
        id: item.id,
        name: item.title,
        description: item.description,
        flag: item.flag || "white", // Preserve the original flag color but default to white if missing
        // Make viewHistory a direct property instead
        onLongPress: () => handleViewFlagHistory(item), // The board component will expose this through item.row().onLongPress
      };
    });

    // Set the board with the processed data
    setList(new BoardRepository(newData));
  };

  const updateListOrder = (
    newIndex: number,
    oldIndex: number,
    id: string,
    isDealbreaker: boolean
  ) => {
    // Safety check
    if (!dealbreaker?.[currentProfileId]) return;

    // Set flag to indicate this is a user-initiated drag operation
    const isDragOperation = isDragOperationRef.current;
    // Reset the flag for next time
    isDragOperationRef.current = false;

    // Log before making changes
    logProfileFlags("Before updateListOrder");

    // Create a deep copy of the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker));

    // Get references to the current profile's lists
    const flagsList = updatedDealbreaker[currentProfileId].flag || [];
    const dealbreakersList =
      updatedDealbreaker[currentProfileId].dealbreaker || [];

    let movedItem = null;

    // Case 1: Moving within the same list (reordering)
    if (
      (isDealbreaker &&
        dealbreakerListIndexRef.current.get(id) !== undefined) ||
      (!isDealbreaker && flagListIndexRef.current.get(id) !== undefined)
    ) {
      // Get the source list
      const sourceList = isDealbreaker ? dealbreakersList : flagsList;

      // Find the item to move
      if (oldIndex >= 0 && oldIndex < sourceList.length) {
        movedItem = { ...sourceList[oldIndex] };
        // Remove from current position
        sourceList.splice(oldIndex, 1);
        // Insert at new position
        sourceList.splice(newIndex, 0, movedItem);
      }
    }
    // Case 2: Moving from flags to dealbreakers
    else if (isDealbreaker) {
      // Find the item in the flags list
      if (oldIndex >= 0 && oldIndex < flagsList.length) {
        movedItem = { ...flagsList[oldIndex] };

        // If this is a user drag operation, we'll wait for reason confirmation
        if (isDragOperation) {
          // Save the transition info but don't move the item yet
          setPendingTransition({
            type: "flag-to-dealbreaker",
            profileId: currentProfileId,
            profileName: getCurrentProfileName(),
            itemId: movedItem.id,
            itemTitle: movedItem.title,
            prevStatus: movedItem.flag || "white",
            newStatus: movedItem.flag || "white",
            prevCardType: "flag",
            newCardType: "dealbreaker",
          });
          setTransitionReasonModalVisible(true);

          // Return without updating the state
          return;
        } else {
          // For non-user operations, proceed with the move immediately
          // Remove from flags list
          flagsList.splice(oldIndex, 1);
          // Add to dealbreakers list at the specified position
          dealbreakersList.splice(newIndex, 0, movedItem);
        }
      }
    }
    // Case 3: Moving from dealbreakers to flags
    else {
      // Find the item in the dealbreakers list
      if (oldIndex >= 0 && oldIndex < dealbreakersList.length) {
        movedItem = { ...dealbreakersList[oldIndex] };

        // If this is a user drag operation, we'll wait for reason confirmation
        if (isDragOperation) {
          // Apply flag color for the pending transition
          let newFlagColor = "white";
          if (
            currentProfileId !== "main" &&
            isItemOnMainDealbreakerList(movedItem.id)
          ) {
            // Make the flag yellow when it's a dealbreaker on main profile
            newFlagColor = "yellow";
          }

          // Save the transition info but don't move the item yet
          setPendingTransition({
            type: "dealbreaker-to-flag",
            profileId: currentProfileId,
            profileName: getCurrentProfileName(),
            itemId: movedItem.id,
            itemTitle: movedItem.title,
            prevStatus: movedItem.flag || "white",
            newStatus: newFlagColor,
            prevCardType: "dealbreaker",
            newCardType: "flag",
            newFlagColor: newFlagColor,
          });
          setTransitionReasonModalVisible(true);

          // Return without updating the state
          return;
        } else {
          // For non-user operations, proceed with the move immediately
          // Remove from dealbreakers list
          dealbreakersList.splice(oldIndex, 1);

          // Set flag color
          if (
            currentProfileId !== "main" &&
            isItemOnMainDealbreakerList(movedItem.id)
          ) {
            // Make the flag yellow when it's a dealbreaker on main profile
            movedItem.flag = "yellow";
          } else {
            // Otherwise, reset to a white flag
            movedItem.flag = "white";
          }

          // Add to flags list at the specified position
          flagsList.splice(newIndex, 0, movedItem);
        }
      }
    }

    // Safety check - if we didn't move anything, exit
    if (!movedItem) return;

    // Update the state with the modified lists
    updatedDealbreaker[currentProfileId].flag = flagsList;
    updatedDealbreaker[currentProfileId].dealbreaker = dealbreakersList;

    // Log after making changes
    console.log(
      "After updateListOrder - about to update state with:",
      updatedDealbreaker[currentProfileId].flag.map(
        (f) => `${f.title} - ${f.flag || "white"}`
      )
    );

    console.log(
      "Updated deal breaker list",
      JSON.stringify(updatedDealbreaker)
    );
    // Set the updated state
    setDealbreaker(updatedDealbreaker);

    // Force a complete UI refresh to ensure changes are visible
    setIsRemount(true);
    setTimeout(() => {
      setIsRemount(false);
      setList(null);
      console.log("calling update");
      updateBoard(true, updatedDealbreaker);
      setRefreshKey(Date.now());

      // Force a navigation update to ensure state is current everywhere
      // if (navigation && navigation.setParams) {
      // 	navigation.setParams({ forceRefresh: Date.now() });
      // }
    }, 300);
  };

  var Styles = StyleSheet.create({ container: { height: ScreenHeight } });

  const [list, setList] = useState<BoardRepository | null>(null);

  // Add safety checks to prevent accessing properties of undefined
  console.log("flag: ", dealbreaker?.[currentProfileId]?.flag || []);
  console.log(
    "dealbreaker: ",
    dealbreaker?.[currentProfileId]?.dealbreaker || []
  );

  const handleDeleteItem = (item: any) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmDeleteItem = () => {
    if (
      !itemToDelete ||
      !itemToDelete.attributes ||
      !itemToDelete.attributes.row
    ) {
      setDeleteModalVisible(false);
      return;
    }

    const rowId = itemToDelete.attributes.row.id;
    if (!rowId) {
      setDeleteModalVisible(false);
      setItemToDelete(null);
      return;
    }

    const isDealbreaker = itemToDelete.attributes.columnId === 2;
    const type = isDealbreaker ? "dealbreaker" : "flag";

    // Close the modal first for better UX
    setDeleteModalVisible(false);
    setItemToDelete(null);

    // Delete the item using our central function
    removeItemFromAllProfiles(rowId, type);

    // Show success message
    showToast("success", `Item deleted from all profiles`);

    // Force a complete UI refresh to ensure deleted item disappears
    setList(null);
    setIsRemount(true);

    // Give state update time to complete, then refresh the board
    setTimeout(() => {
      // Only try to update the board if we still have a valid state
      if (dealbreaker && currentProfileId && dealbreaker[currentProfileId]) {
        updateBoard();
      }

      setIsRemount(false);
      setRefreshKey(Date.now());

      // Force a navigation update to ensure state is current everywhere
      // if (navigation && navigation.setParams) {
      // 	navigation.setParams({ forceRefresh: Date.now() });
      // }
    }, 300);
  };

  const handleEditItem = (item: any) => {
    // Extract the raw item data from the board item
    if (item && item.attributes && item.attributes.row) {
      const rowData = item.attributes.row;
      // Find the actual item in the dealbreaker state
      const isDealbreaker = item.attributes.columnId === 2;
      const type = isDealbreaker ? "dealbreaker" : "flag";

      const items = dealbreaker[currentProfileId][type];
      const foundItem = items.find((i: any) => i.id === rowData.id);

      if (foundItem) {
        setItemToEdit(foundItem);
        setEditModalVisible(true);
      } else {
        showToast("error", "Item not found");
      }
    }
  };

  // Check if we need to add the handleSaveEdit function if it's missing
  const handleSaveEdit = (updatedItem: any) => {
    if (!updatedItem || !updatedItem.id) return;

    // Determine the type (flag or dealbreaker)
    const isFlagItem = dealbreaker[currentProfileId].flag.some(
      (item: any) => item.id === updatedItem.id
    );
    const type = isFlagItem ? "flag" : "dealbreaker";

    // Create a copy of the dealbreaker state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker));

    // Update the item in all profiles
    Object.keys(updatedDealbreaker).forEach((profileName: string) => {
      if (
        updatedDealbreaker[profileName] &&
        updatedDealbreaker[profileName][type]
      ) {
        updatedDealbreaker[profileName][type] = updatedDealbreaker[profileName][
          type
        ].map((item: any) => {
          if (item.id === updatedItem.id) {
            return {
              ...item,
              title: updatedItem.title,
              description: updatedItem.description,
            };
          }
          return item;
        });
      }
    });

    // Update the state
    setDealbreaker(updatedDealbreaker);

    // Close the modal
    setEditModalVisible(false);
    setItemToEdit(null);

    // Show a success message
    showToast("success", "Item updated successfully");

    // Force UI update
    setRefreshKey(Date.now());
  };

  // Handle profile edit button click
  const handleEditProfile = () => {
    // Don't allow editing main profile
    if (currentProfileId === "main") {
      showToast("error", "The main profile cannot be renamed");
      return;
    }

    setEditProfileModalVisible(true);
  };

  // Handle save profile edit
  const handleSaveProfileEdit = (profileId: string, newName: string) => {
    // Call the store context function to rename the profile
    const success = renameProfile(profileId, newName);

    if (success) {
      showToast("success", "Profile renamed successfully");

      // Find the updated profile name to display
      const updatedProfile = profiles.find((p: any) => p.id === profileId);
      if (updatedProfile) {
        console.log(`Profile renamed: ${profileId} -> ${updatedProfile.name}`);
      }

      // Force a UI refresh
      setRefreshKey(Date.now());
    } else {
      showToast("error", "Failed to rename profile");
    }
  };

  // Refresh the screen when it comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Lists screen focused - refreshing");

      // Force refresh
      setRefreshKey(Date.now());

      // Check if we have data to show
      if (dealbreaker?.[currentProfileId]) {
        const hasItems =
          dealbreaker[currentProfileId].flag?.length > 0 ||
          dealbreaker[currentProfileId].dealbreaker?.length > 0;

        if (hasItems) {
          // Has items - update board
          updateBoard();
        } else {
          // No items - show empty state
          setList(null);
        }
      }

      return () => {
        // Clean up when screen is unfocused
      };
    }, [dealbreaker, currentProfileId])
  );

  // Check if an item is on the main profile's dealbreaker list
  const isItemOnMainDealbreakerList = (itemId: string) => {
    if (!dealbreaker?.main?.dealbreaker) return false;

    return dealbreaker.main.dealbreaker.some((item) => item.id === itemId);
  };

  // Wrapper functions to pass required params to context functions

  // Handle flag click (color change)
  const handleFlagClick = (newFlag: any, item: any) => {
    contextHandleFlagClick(
      newFlag,
      item,
      dealbreaker,
      currentProfileId,
      setDealbreaker
    );
  };

  // Handle viewing flag history
  const handleViewFlagHistory = (item: any) => {
    contextHandleViewFlagHistory(item, currentProfileId);
  };

  // Handle adding additional reason with profiles
  const handleAddAdditionalReason = (reason: any, attachments: any[] = []) => {
    contextHandleAddAdditionalReason(reason, attachments, profiles);
  };

  // Handle flag change with reason
  const handleFlagChangeWithReason = (reason: any, attachments: any[] = []) => {
    contextHandleFlagChangeWithReason(reason, attachments, profiles);

    // Check if we need to handle dealbreaker transition
    checkForDealbreakerTransition();
  };

  // Function to check if a flag change should trigger dealbreaker transition
  const checkForDealbreakerTransition = () => {
    if (!pendingFlagChange) return;

    const { rowId, newFlag } = pendingFlagChange;

    // Check if this should auto-transition to dealbreaker
    if (
      newFlag === "red" &&
      currentProfileId !== "main" &&
      isItemOnMainDealbreakerList(rowId)
    ) {
      // This is a match for auto-transition!
      console.log(
        "Auto-transitioning item to dealbreaker:",
        pendingFlagChange.item.attributes.row.name
      );

      // Show the alert
      setDealbreakerAlertVisible(true);
    }
  };

  // Keep the existing handleUndoTransition function
  const handleUndoTransition = () => {
    if (!transitionedItem) return;

    // Close the dealbreaker alert
    setDealbreakerAlertVisible(false);

    // Set up pending transition for the undo
    const flagColor = isItemOnMainDealbreakerList(transitionedItem.id)
      ? "yellow"
      : "white";

    setPendingTransition({
      type: "dealbreaker-to-flag",
      profileId: currentProfileId,
      profileName: getCurrentProfileName(),
      itemId: transitionedItem.id,
      itemTitle: transitionedItem.title,
      prevStatus: transitionedItem.flag || "white",
      newStatus: flagColor,
      prevCardType: "dealbreaker",
      newCardType: "flag",
      newFlagColor: flagColor,
      isUndo: true, // Mark this as an undo operation
    });

    // Save the transitioned item to be used if the user confirms the reason
    setTransitionReasonModalVisible(true);
  };

  // Get current profile name
  const getCurrentProfileName = () => {
    const profile = profiles.find((p: any) => p.id === currentProfileId);
    return profile ? profile.name : currentProfileId;
  };

  // Function to handle transition reason submission
  const handleTransitionReasonSubmit = (
    reason: string,
    attachments: any[] = []
  ) => {
    if (!pendingTransition) {
      setTransitionReasonModalVisible(false);
      return;
    }

    // Copy the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker));

    // Handle all transition types
    if (pendingTransition.type === "flag-to-dealbreaker") {
      // Find and remove the item from flags list
      const itemIndex = updatedDealbreaker[currentProfileId].flag.findIndex(
        (item: any) => item.id === pendingTransition.itemId
      );

      if (itemIndex !== -1) {
        // Get the item
        const movedItem = updatedDealbreaker[currentProfileId].flag[itemIndex];

        // Remove from flags list
        updatedDealbreaker[currentProfileId].flag.splice(itemIndex, 1);

        // Add to dealbreakers list
        updatedDealbreaker[currentProfileId].dealbreaker.push(movedItem);
      }
    } else if (pendingTransition.type === "dealbreaker-to-flag") {
      // Check if it's an undo operation
      if (pendingTransition.isUndo && transitionedItem) {
        // Remove the item from dealbreaker list
        updatedDealbreaker[currentProfileId].dealbreaker = updatedDealbreaker[
          currentProfileId
        ].dealbreaker.filter((item: any) => item.id !== transitionedItem.id);

        // Add the item back to flag list with appropriate flag color
        updatedDealbreaker[currentProfileId].flag.push({
          ...transitionedItem,
          flag: pendingTransition.newFlagColor,
        });

        // Clear the transitioning item
        setTransitionedItem(null);
      } else {
        // Find and remove the item from dealbreakers list
        const itemIndex = updatedDealbreaker[
          currentProfileId
        ].dealbreaker.findIndex(
          (item: any) => item.id === pendingTransition.itemId
        );

        if (itemIndex !== -1) {
          // Get the item
          const movedItem =
            updatedDealbreaker[currentProfileId].dealbreaker[itemIndex];

          // Apply flag color
          if (
            currentProfileId !== "main" &&
            isItemOnMainDealbreakerList(movedItem.id)
          ) {
            movedItem.flag = "yellow";
          } else {
            movedItem.flag = "white";
          }

          // Remove from dealbreakers list
          updatedDealbreaker[currentProfileId].dealbreaker.splice(itemIndex, 1);

          // Add to flags list
          updatedDealbreaker[currentProfileId].flag.push(movedItem);
        }
      }
    }

    // Update the state
    setDealbreaker(updatedDealbreaker);

    // Create flag history entry with the provided reason
    addFlagHistory(
      pendingTransition.profileId,
      pendingTransition.profileName,
      pendingTransition.itemId,
      pendingTransition.itemTitle,
      pendingTransition.prevStatus,
      pendingTransition.newStatus,
      reason ||
        (pendingTransition.isUndo
          ? "Undid transition to dealbreaker"
          : pendingTransition.type === "flag-to-dealbreaker"
          ? "Moved to Dealbreakers"
          : "Moved to Flags"),
      user?.id || null,
      pendingTransition.prevCardType,
      pendingTransition.newCardType
    );

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      // Handle attachments (this would depend on your existing attachment handling logic)
    }

    // Clear pending transition and close modal
    setPendingTransition(null);
    setTransitionReasonModalVisible(false);

    // Force a complete UI refresh
    // setTimeout(() => {
    // 	setIsRemount(false);
    // 	setList(null);
    // 	updateBoard();
    // 	setRefreshKey(Date.now());

    // 	// Force navigation update
    // 	if (navigation && navigation.setParams) {
    // 		navigation.setParams({ forceRefresh: Date.now() });
    // 	}
    // }, 300);

    // Show feedback
    if (pendingTransition.isUndo) {
      showToast("success", "Transition undone. Item moved back to flags list.");
    } else {
      showToast(
        "success",
        pendingTransition.type === "flag-to-dealbreaker"
          ? "Item moved to Dealbreakers"
          : "Item moved to Flags"
      );
    }
  };

  // Function to handle transition reason cancellation
  const handleTransitionReasonCancel = () => {
    // Close the modal and reset the pending transition
    setTransitionReasonModalVisible(false);
    setPendingTransition(null);

    // Force a UI refresh to revert to the previous state
    setIsRemount(true);
    setTimeout(() => {
      setIsRemount(false);
      setList(null);
      updateBoard();
      setRefreshKey(Date.now());
    }, 300);
  };
  console.log("dealbreaker: ", dealbreaker?.main?.dealbreaker);
  // Function to clean up any duplicate items that exist in both flags and dealbreakers lists
  const cleanupDuplicates = () => {
    // Safety check
    if (!dealbreaker || !currentProfileId || !dealbreaker[currentProfileId])
      return;

    // Create a deep copy of the current state
    const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker));

    // Get references to the current profile's lists
    const flagsList = updatedDealbreaker[currentProfileId].flag || [];
    const dealbreakersList =
      updatedDealbreaker[currentProfileId].dealbreaker || [];

    // Create a set of IDs from the dealbreakers list
    const dealbreakerIds = new Set(
      dealbreakersList.map((item: any) => item.id)
    );

    // Filter out any items from flags list that exist in dealbreakers list
    const cleanFlagsList = flagsList.filter(
      (item: any) => !dealbreakerIds.has(item.id)
    );

    // If we found and removed any duplicates
    if (cleanFlagsList.length < flagsList.length) {
      console.log(
        `Removed ${
          flagsList.length - cleanFlagsList.length
        } duplicate items from flags list`
      );

      // Update the state with the cleaned list
      updatedDealbreaker[currentProfileId].flag = cleanFlagsList;
      setDealbreaker(updatedDealbreaker);

      // Force a complete UI refresh
      setIsRemount(true);
      setTimeout(() => {
        setIsRemount(false);
        setList(null);
        updateBoard();
        setRefreshKey(Date.now());
      }, 300);

      showToast("success", "Duplicate items removed");
    }
  };
  console.log("- additionalReasonModalVisible:", additionalReasonModalVisible);
  // Add this function to check modal state visibility
  const debugModalState = () => {
    console.log("--- Debug Modal State ---");
    console.log("- reasonModalVisible:", reasonModalVisible);
    console.log(
      "- additionalReasonModalVisible:",
      additionalReasonModalVisible
    );
    console.log("- historyModalVisible:", historyModalVisible);
    console.log("- pendingFlagChange:", pendingFlagChange);
    console.log("- selectedFlag:", selectedFlag);
  };

  return (
    <View style={styles.container}>
      <SwitchProfileModal visible={visible} onClose={() => setVisible(false)} />

      <ConfirmationModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        message="This will delete the item from all profiles. Are you sure you want to delete it?"
      />

      <EditItemModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setItemToEdit(null);
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
          setDealbreakerAlertVisible(false);
          setTransitionedItem(null);
        }}
        onUndo={handleUndoTransition}
        itemTitle={transitionedItem?.title || ""}
      />

      {/* Flag change reason modal from context */}
      <ReasonInputModal
        key={`reasonModal-${reasonModalVisible}`}
        visible={reasonModalVisible}
        onClose={handleCancelFlagChange}
        onSubmit={handleFlagChangeWithReason}
        flagTitle={pendingFlagChange?.item?.attributes?.row?.name || "Flag"}
        prevStatus={pendingFlagChange?.previousStatus || "white"}
        newStatus={pendingFlagChange?.newFlag || "white"}
      />

      {/* Additional reason modal from context */}
      <ReasonInputModal
        key={`additionalReasonModal-${additionalReasonModalVisible}`}
        visible={additionalReasonModalVisible}
        onClose={() => setAdditionalReasonModalVisible(false)}
        onSubmit={handleAddAdditionalReason}
        flagTitle={selectedFlag?.title || selectedFlag?.name || "Flag"}
        prevStatus="white"
        newStatus={selectedFlag?.flag || "white"}
        modalTitle="Add Additional Context"
      />

      {/* Flag history modal from context */}
      {selectedFlag && (
        <FlagHistoryModal
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
          profileId={currentProfileId}
          flagId={selectedFlag?.id}
          flagTitle={selectedFlag?.title || selectedFlag?.name || ""}
          onAddReason={handleOpenAddReasonModal}
        />
      )}

      {/* Transition reason modal */}
      <ReasonInputModal
        visible={transitionReasonModalVisible}
        onClose={handleTransitionReasonCancel}
        onSubmit={handleTransitionReasonSubmit}
        flagTitle={pendingTransition?.itemTitle || "Item"}
        prevStatus={
          pendingTransition?.type === "dealbreaker-to-flag"
            ? "dealbreaker"
            : pendingTransition?.prevStatus || "white"
        }
        newStatus={pendingTransition?.newStatus || "white"}
        modalTitle={
          pendingTransition?.type === "flag-to-dealbreaker"
            ? "Moving to Dealbreakers"
            : "Moving to Flags"
        }
      />

      {list &&
      !isRemount &&
      dealbreaker?.[currentProfileId] &&
      (dealbreaker[currentProfileId]?.flag?.length > 0 ||
        dealbreaker[currentProfileId]?.dealbreaker?.length > 0) ? (
        <>
          <View>
            <View style={styles.profileButtonContainer}>
              <View style={styles.innerProfileButtonContainer}>
                {/* <View style={styles.buttonRow}> */}
                {/* <AppButton
										title={`Switch Profile`}
										onPress={() => {
											setVisible(true);
										}}
									/> */}
                {/* {isOnline && (
										<AppButton
											title='Sync'
											onPress={() => {
												if (syncData) {
													syncData();
													showToast(
														'info',
														'Syncing with cloud...'
													);
												}
											}}
										/>
									)} */}
                {/* </View> */}
                <View style={styles.profileSwitchTextContainer}>
                  <Text style={styles.profileLabel}>Profile: </Text>
                  <View style={styles.profileNameContainer}>
                    <Text style={styles.profileText}>
                      {getCurrentProfileName()}
                    </Text>
                    {currentProfileId !== "main" && (
                      <TouchableOpacity
                        style={styles.editProfileButton}
                        onPress={handleEditProfile}
                      >
                        <Text style={styles.editProfileText}>✏️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {!isRemount ? (
              <Board
                cardBorderRadius="10px"
                key={`board-${currentProfileId}-${refreshKey}`}
                boardRepository={list}
                open={() => {}}
                onFlagClicked={handleFlagClick}
                onDragEnd={(boardItemOne, boardItemTwo, draggedItem) => {
                  if (!dealbreaker?.[currentProfileId]) return;

                  // Set the flag to indicate this is a user drag operation
                  isDragOperationRef.current = true;

                  let isDealbreaker = false;
                  if (draggedItem.attributes.columnId === 2) {
                    isDealbreaker = true;
                  }
                  let oldIndex = flagListIndexRef.current.get(
                    draggedItem.attributes.row.id
                  );
                  console.log("oldIndex: ", oldIndex);
                  console.log("draggedItem: ", draggedItem.attributes.row.id);
                  if (!oldIndex && oldIndex !== 0) {
                    oldIndex = dealbreakerListIndexRef.current.get(
                      draggedItem.attributes.row.id
                    );
                  }
                  updateListOrder(
                    draggedItem.attributes.index,
                    oldIndex,
                    draggedItem.attributes.row.id,
                    isDealbreaker
                  );

                  // Force a complete UI refresh after drag operation
                  //   setIsRemount(true);
                  //   setTimeout(() => {
                  //     updateBoard(true);
                  //     setTimeout(() => {
                  //       setRefreshKey(Date.now());
                  //       setIsRemount(false);
                  //     }, 1000);
                  //   }, 1000);
                }}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
                isWithCountBadge={false}
                cardNameTextColor="white"
              />
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.noDealbreakerContainer}>
          <View style={styles.noDealbreakerInContainer}>
            <Text style={styles.noDealbreakerText}>
              {isRemount ? "" : "No Flags Yet"}
            </Text>
            {!isRemount && (
              <AppButton
                title="Create Flag"
                onPress={() => {
                  router.push("/create-flag");
                }}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // justifyContent: 'fl',
  },
  noDealbreakerContainer: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  noDealbreakerInContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  noDealbreakerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profileButtonContainer: {
    marginTop: 10,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  innerProfileButtonContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  profileSwitchTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 5,
  },
  profileNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  profileText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  editProfileButton: {
    marginLeft: 5,
  },
  editProfileText: {
    fontSize: 16,
  },
  emptyView: {
    height: 80,
  },
});
