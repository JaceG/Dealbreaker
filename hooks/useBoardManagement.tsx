import { useContext, useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import StoreContext from '../store';
import { useFlagContext } from '../context/FlagContext';
import { useAuth } from '../context/Auth';
import { BoardRepository } from '../libs/board/components';
import { showToast } from '../utils/functions';
import { addFlagHistory } from '../utils/mongodb';
import { data, PendingTransition } from '../models/boardManagementModel';
import { useModalStates } from './boardManagement/useModalStates';
import { useBoardOperations } from './boardManagement/useBoardOperations';
import { useItemOperations } from './boardManagement/useItemOperations';
import { useTransitions } from './boardManagement/useTransitions';

const useBoardManagement = () => {
	let ScreenHeight = Dimensions.get('window').height - 150;
	// Get route params using expo-router hook
	const params = useLocalSearchParams();

	// Explicitly type context hooks as any to avoid linter errors
	const {
		dealbreaker,
		setDealbreaker,
		currentProfileId,
		profiles,
		ensureProfileExists,
		renameProfile,
		removeItemFromAllProfiles,
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

	// Modal states hook
	const {
		visible,
		setVisible,
		deleteModalVisible,
		setDeleteModalVisible,
		editModalVisible,
		setEditModalVisible,
		editProfileModalVisible,
		setEditProfileModalVisible,
		dealbreakerAlertVisible,
		setDealbreakerAlertVisible,
		transitionReasonModalVisible,
		setTransitionReasonModalVisible,
		itemToDelete,
		setItemToDelete,
		itemToEdit,
		setItemToEdit,
		transitionedItem,
		setTransitionedItem,
	} = useModalStates();

	// Handle viewing flag history
	const handleViewFlagHistory = (item: any) => {
		contextHandleViewFlagHistory(item, currentProfileId);
	};

	// Board operations hook
	const {
		list,
		setList,
		isRemount,
		setIsRemount,
		refreshKey,
		setRefreshKey,
		flagListIndexRef,
		dealbreakerListIndexRef,
		skipUpdateRef,
		isMountRef,
		updateBoard,
		reloadBoard,
		cleanupDuplicates,
		logProfileFlags,
		ensureCurrentProfileExists,
	} = useBoardOperations(
		dealbreaker,
		currentProfileId,
		ensureProfileExists,
		params,
		handleViewFlagHistory
	);

	// Item operations hook
	const {
		handleDeleteItem,
		confirmDeleteItem,
		handleEditItem,
		handleSaveEdit,
	} = useItemOperations(
		dealbreaker,
		currentProfileId,
		removeItemFromAllProfiles,
		setDealbreaker,
		updateBoard,
		setList,
		setIsRemount,
		setRefreshKey,
		itemToDelete,
		setItemToDelete,
		itemToEdit,
		setItemToEdit,
		setDeleteModalVisible,
		setEditModalVisible
	);

	// Transitions hook
	const {
		pendingTransition,
		setPendingTransition,
		isDragOperationRef,
		updateListOrder,
		checkForDealbreakerTransition,
		handleUndoTransition,
		handleTransitionReasonSubmit,
		handleTransitionReasonCancel,
		isItemOnMainDealbreakerList,
		getCurrentProfileName,
	} = useTransitions(
		dealbreaker,
		currentProfileId,
		setDealbreaker,
		profiles,
		user,
		updateBoard,
		flagListIndexRef,
		dealbreakerListIndexRef,
		setIsRemount,
		setList,
		setRefreshKey,
		logProfileFlags,
		setDealbreakerAlertVisible,
		setTransitionReasonModalVisible,
		setTransitionedItem,
		transitionedItem,
		pendingFlagChange
	);

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
		logProfileFlags('Dealbreaker state updated');
		reloadBoard();
	}, [dealbreaker]);

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
		const hasRefreshParam = params.refresh || params.forceRefresh;

		if (!hasRefreshParam) return;

		console.log('Refreshing via navigation param', params);

		// Reset navigation params first to avoid loops
		// Note: With expo-router, we don't need to manually clear params
		// as the router handles this differently

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
	}, [params?.refresh, params?.forceRefresh, currentProfileId, dealbreaker]);

	useEffect(() => {
		reloadBoard();
	}, [dealbreaker]);

	// Add safety checks to prevent accessing properties of undefined
	console.log('flag: ', dealbreaker?.[currentProfileId]?.flag || []);
	console.log(
		'dealbreaker: ',
		dealbreaker?.[currentProfileId]?.dealbreaker || []
	);

	// Handle profile edit button click
	const handleEditProfile = () => {
		// Don't allow editing main profile
		if (currentProfileId === 'main') {
			showToast('error', 'The main profile cannot be renamed');
			return;
		}

		setEditProfileModalVisible(true);
	};

	// Handle save profile edit
	const handleSaveProfileEdit = (profileId: string, newName: string) => {
		// Call the store context function to rename the profile
		const success = renameProfile(profileId, newName);

		if (success) {
			showToast('success', 'Profile renamed successfully');

			// Find the updated profile name to display
			const updatedProfile = profiles.find(
				(p: any) => p.id === profileId
			);
			if (updatedProfile) {
				console.log(
					`Profile renamed: ${profileId} -> ${updatedProfile.name}`
				);
			}

			// Force a UI refresh
			setRefreshKey(Date.now());
		} else {
			showToast('error', 'Failed to rename profile');
		}
	};

	// Refresh the screen when dealbreaker or currentProfileId changes
	useEffect(() => {
		console.log('Lists screen data changed - refreshing');

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
	}, [dealbreaker, currentProfileId]);

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

	// Handle adding additional reason with profiles
	const handleAddAdditionalReason = (
		reason: any,
		attachments: any[] = []
	) => {
		contextHandleAddAdditionalReason(reason, attachments, profiles);
	};

	// Handle flag change with reason
	const handleFlagChangeWithReason = (
		reason: any,
		attachments: any[] = []
	) => {
		contextHandleFlagChangeWithReason(reason, attachments, profiles);

		// Check if we need to handle dealbreaker transition
		checkForDealbreakerTransition();
	};

	console.log('dealbreaker: ', dealbreaker?.main?.dealbreaker);
	console.log(
		'- additionalReasonModalVisible:',
		additionalReasonModalVisible
	);
	// Add this function to check modal state visibility
	const debugModalState = () => {
		console.log('--- Debug Modal State ---');
		console.log('- reasonModalVisible:', reasonModalVisible);
		console.log(
			'- additionalReasonModalVisible:',
			additionalReasonModalVisible
		);
		console.log('- historyModalVisible:', historyModalVisible);
		console.log('- pendingFlagChange:', pendingFlagChange);
		console.log('- selectedFlag:', selectedFlag);
	};
	return {
		// Core Data & Context
		ScreenHeight,
		params,
		dealbreaker,
		profiles,
		user,
		currentProfileId,

		// Board State
		list,
		isRemount,
		refreshKey,

		// Modal Visibility States
		visible,
		deleteModalVisible,
		editModalVisible,
		editProfileModalVisible,
		reasonModalVisible,
		additionalReasonModalVisible,
		historyModalVisible,
		dealbreakerAlertVisible,
		transitionReasonModalVisible,

		// Modal State Setters
		setVisible,
		setDeleteModalVisible,
		setEditModalVisible,
		setEditProfileModalVisible,
		setReasonModalVisible,
		setAdditionalReasonModalVisible,
		setHistoryModalVisible,
		setDealbreakerAlertVisible,
		setTransitionReasonModalVisible,

		// Item & Transition State
		itemToDelete,
		setItemToDelete,
		itemToEdit,
		setItemToEdit,
		transitionedItem,
		setTransitionedItem,
		pendingFlagChange,
		selectedFlag,
		pendingTransition,

		// Board Management
		setIsRemount,
		setList,

		// Refs & Internal State
		flagListIndexRef,
		dealbreakerListIndexRef,
		isDragOperationRef,

		// Event Handlers
		handleDeleteItem,
		handleEditItem,
		handleSaveEdit,
		handleEditProfile,
		handleSaveProfileEdit,
		handleFlagClick,
		handleViewFlagHistory,
		handleFlagChangeWithReason,
		handleCancelFlagChange,
		handleAddAdditionalReason,
		handleOpenAddReasonModal,
		handleUndoTransition,
		handleTransitionReasonSubmit,
		handleTransitionReasonCancel,

		// Action Functions
		confirmDeleteItem,
		updateListOrder,
		updateBoard,
		cleanupDuplicates,

		// Utility Functions
		getCurrentProfileName,
		debugModalState,
	};
};

export default useBoardManagement;
