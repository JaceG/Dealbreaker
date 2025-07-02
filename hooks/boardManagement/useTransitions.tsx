import { useRef, useState } from 'react';
import { showToast } from '../../utils/functions';
import { addFlagHistory } from '../../utils/mongodb';
import { PendingTransition } from '../../models/boardManagementModel';
import { FlagItem } from '../../models';

export const useTransitions = (
	dealbreaker: any,
	currentProfileId: string,
	setDealbreaker: (value: any) => void,
	profiles: any[],
	user: any,
	updateBoard: (force?: boolean, forceData?: any) => void,
	flagListIndexRef: React.MutableRefObject<Map<string, number>>,
	dealbreakerListIndexRef: React.MutableRefObject<Map<string, number>>,
	setIsRemount: (value: boolean) => void,
	setList: (value: any) => void,
	setRefreshKey: (value: number) => void,
	logProfileFlags: (label: string) => void,
	// Modal states from useModalStates
	setDealbreakerAlertVisible: (visible: boolean) => void,
	setTransitionReasonModalVisible: (visible: boolean) => void,
	setTransitionedItem: (item: any) => void,
	transitionedItem: any,
	// Flag context state
	pendingFlagChange: any
) => {
	// Transition state
	const [pendingTransition, setPendingTransition] =
		useState<PendingTransition | null>(null);

	// Create a reference to track if an operation is a user drag
	const isDragOperationRef = useRef(false);

	// Check if an item is on the main profile's dealbreaker list
	const isItemOnMainDealbreakerList = (itemId: string) => {
		if (!dealbreaker?.main?.dealbreaker) return false;

		return dealbreaker.main.dealbreaker.some(
			(item: FlagItem) => item.id === itemId
		);
	};

	// Get current profile name
	const getCurrentProfileName = () => {
		const profile = profiles.find((p: any) => p.id === currentProfileId);
		return profile ? profile.name : currentProfileId;
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
		logProfileFlags('Before updateListOrder');

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
						type: 'flag-to-dealbreaker',
						profileId: currentProfileId,
						profileName: getCurrentProfileName(),
						itemId: movedItem.id,
						itemTitle: movedItem.title,
						prevStatus: movedItem.flag || 'white',
						newStatus: movedItem.flag || 'white',
						prevCardType: 'flag',
						newCardType: 'dealbreaker',
						newFlagColor: 'white',
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
					let newFlagColor = 'white';
					if (
						currentProfileId !== 'main' &&
						isItemOnMainDealbreakerList(movedItem.id)
					) {
						// Make the flag yellow when it's a dealbreaker on main profile
						newFlagColor = 'yellow';
					}

					// Save the transition info but don't move the item yet
					setPendingTransition({
						type: 'dealbreaker-to-flag',
						profileId: currentProfileId,
						profileName: getCurrentProfileName(),
						itemId: movedItem.id,
						itemTitle: movedItem.title,
						prevStatus: movedItem.flag || 'white',
						newStatus: newFlagColor,
						prevCardType: 'dealbreaker',
						newCardType: 'flag',
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
						currentProfileId !== 'main' &&
						isItemOnMainDealbreakerList(movedItem.id)
					) {
						// Make the flag yellow when it's a dealbreaker on main profile
						movedItem.flag = 'yellow';
					} else {
						// Otherwise, reset to a white flag
						movedItem.flag = 'white';
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

		console.log(
			'Updated deal breaker list',
			JSON.stringify(updatedDealbreaker)
		);
		// Set the updated state
		setDealbreaker(updatedDealbreaker);

		// Force a complete UI refresh to ensure changes are visible
		setIsRemount(true);
		setTimeout(() => {
			setIsRemount(false);
			setList(null);
			console.log('calling update');
			updateBoard(true, updatedDealbreaker);
			setRefreshKey(Date.now());
		}, 300);
	};

	// Function to check if a flag change should trigger dealbreaker transition
	const checkForDealbreakerTransition = () => {
		if (!pendingFlagChange) return;

		const { rowId, newFlag } = pendingFlagChange;

		// Check if this should auto-transition to dealbreaker
		if (
			newFlag === 'red' &&
			currentProfileId !== 'main' &&
			isItemOnMainDealbreakerList(rowId)
		) {
			// This is a match for auto-transition!
			console.log(
				'Auto-transitioning item to dealbreaker:',
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
			? 'yellow'
			: 'white';

		setPendingTransition({
			type: 'dealbreaker-to-flag',
			profileId: currentProfileId,
			profileName: getCurrentProfileName(),
			itemId: transitionedItem.id,
			itemTitle: transitionedItem.title,
			prevStatus: transitionedItem.flag || 'white',
			newStatus: flagColor,
			prevCardType: 'dealbreaker',
			newCardType: 'flag',
			newFlagColor: flagColor,
			isUndo: true, // Mark this as an undo operation
		});

		// Save the transitioned item to be used if the user confirms the reason
		setTransitionReasonModalVisible(true);
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
		if (pendingTransition.type === 'flag-to-dealbreaker') {
			// Find and remove the item from flags list
			const itemIndex = updatedDealbreaker[
				currentProfileId
			].flag.findIndex(
				(item: any) => item.id === pendingTransition.itemId
			);

			if (itemIndex !== -1) {
				// Get the item
				const movedItem =
					updatedDealbreaker[currentProfileId].flag[itemIndex];

				// Remove from flags list
				updatedDealbreaker[currentProfileId].flag.splice(itemIndex, 1);

				// Add to dealbreakers list
				updatedDealbreaker[currentProfileId].dealbreaker.push(
					movedItem
				);
			}
		} else if (pendingTransition.type === 'dealbreaker-to-flag') {
			// Check if it's an undo operation
			if (pendingTransition.isUndo && transitionedItem) {
				// Remove the item from dealbreaker list
				updatedDealbreaker[currentProfileId].dealbreaker =
					updatedDealbreaker[currentProfileId].dealbreaker.filter(
						(item: any) => item.id !== transitionedItem.id
					);

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
						updatedDealbreaker[currentProfileId].dealbreaker[
							itemIndex
						];

					// Apply flag color
					if (
						currentProfileId !== 'main' &&
						isItemOnMainDealbreakerList(movedItem.id)
					) {
						movedItem.flag = 'yellow';
					} else {
						movedItem.flag = 'white';
					}

					// Remove from dealbreakers list
					updatedDealbreaker[currentProfileId].dealbreaker.splice(
						itemIndex,
						1
					);

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
					? 'Undid transition to dealbreaker'
					: pendingTransition.type === 'flag-to-dealbreaker'
					? 'Moved to Dealbreakers'
					: 'Moved to Flags'),
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

		// Show feedback
		if (pendingTransition.isUndo) {
			showToast(
				'success',
				'Transition undone. Item moved back to flags list.'
			);
		} else {
			showToast(
				'success',
				pendingTransition.type === 'flag-to-dealbreaker'
					? 'Item moved to Dealbreakers'
					: 'Item moved to Flags'
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

	return {
		// Transition state
		pendingTransition,
		setPendingTransition,
		isDragOperationRef,

		// Transition functions
		updateListOrder,
		checkForDealbreakerTransition,
		handleUndoTransition,
		handleTransitionReasonSubmit,
		handleTransitionReasonCancel,

		// Utility functions
		isItemOnMainDealbreakerList,
		getCurrentProfileName,
	};
};
