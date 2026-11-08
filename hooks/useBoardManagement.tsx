import { useContext, useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import StoreContext from '../store';
import { useFlagContext } from '../context/FlagContext';
import { useAuth } from '../context/Auth';
import { showToast } from '../utils/functions';
import { getHistoryCounts } from '../utils/api';
import { data } from '../models/boardManagementModel';
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
	// Overview filter: show only flags of one color on the board
	const [colorFilter, setColorFilter] = useState<string | null>(null);
	useEffect(() => setColorFilter(null), [currentProfileId]);
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

	// History entries per card on this profile, for the counter on each card's notes icon.
	const [historyCounts, setHistoryCounts] = useState<Record<string, number>>({});
	// Cards share ids across profiles, so the last profile's counts must not show on this one.
	useEffect(
		() => setHistoryCounts((prev) => (Object.keys(prev).length ? {} : prev)),
		[currentProfileId]
	);
	const anyHistoryModalOpen =
		historyModalVisible || additionalReasonModalVisible || reasonModalVisible;
	useEffect(() => {
		if (anyHistoryModalOpen) return;
		let current = true;
		// Waits a moment so a note saved as a popup closes is counted.
		const timer = setTimeout(async () => {
			const counts = await getHistoryCounts(currentProfileId);
			// A failed request keeps the badges as they were instead of clearing them.
			if (current && counts) {
				setHistoryCounts((prev) =>
					JSON.stringify(prev) === JSON.stringify(counts) ? prev : counts
				);
			}
		}, 1500);
		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [currentProfileId, dealbreaker, anyHistoryModalOpen]);

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
		logProfileFlags,
		ensureCurrentProfileExists,
	} = useBoardOperations(
		dealbreaker,
		currentProfileId,
		ensureProfileExists,
		params,
		handleViewFlagHistory,
		colorFilter,
		historyCounts
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
		console.log('Step 1 [adding]:', JSON.stringify(attachments));
		contextHandleAddAdditionalReason(reason, attachments, profiles);
	};

	// Handle flag change with reason
	const handleFlagChangeWithReason = (
		reason: any,
		attachments: any[] = []
	) => {
		const colorChangeSaved = contextHandleFlagChangeWithReason(
			reason,
			attachments,
			profiles
		);

		// Check if we need to handle dealbreaker transition
		checkForDealbreakerTransition(colorChangeSaved);
	};

	console.log('dealbreaker: ', dealbreaker?.main?.dealbreaker);
	console.log(
		'- additionalReasonModalVisible:',
		additionalReasonModalVisible
	);
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
		colorFilter,
		setColorFilter,
		setRefreshKey,

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

		// Utility Functions
		getCurrentProfileName,
	};
};

export default useBoardManagement;
