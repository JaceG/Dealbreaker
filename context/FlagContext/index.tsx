import React, { createContext, useContext, useState, useEffect } from 'react';
// Import directly from implementation files to bypass index.js
import {
	addFlagHistory,
	addAttachmentToHistory,
} from '../../utils/mongodb/index';
import { getDatabase } from '../../utils';
import FlagHistoryModal from '../../components/FlagHistoryModal';
import ReasonInputModal from '../../components/ReasonInputModal';

// Create the context
const FlagContext = createContext();

// Custom hook to use the flag context
export const useFlagContext = () => useContext(FlagContext);

export const FlagProvider = ({ children, profiles, setDealbreaker }) => {
	// States for flag changes
	const [pendingFlagChange, setPendingFlagChange] = useState(null);
	const [reasonModalVisible, setReasonModalVisible] = useState(false);

	// For FlagHistory Modal
	const [selectedFlag, setSelectedFlag] = useState(null);
	const [historyModalVisible, setHistoryModalVisible] = useState(false);
	const [additionalReasonModalVisible, setAdditionalReasonModalVisible] =
		useState(false);

	// Function to handle flag click and show reason modal
	const handleFlagClick = (
		newFlag,
		item,
		dealbreaker,
		currentProfileId,
		setDealbreaker
	) => {
		// If not current profile or item data is missing, exit early
		if (!dealbreaker?.[currentProfileId]?.flag || !item?.attributes?.row)
			return;

		const rowId = item.attributes.row.id;
		const flagsList = dealbreaker[currentProfileId].flag;

		// Get the current flag item to determine previous status
		const existingFlags = JSON.parse(JSON.stringify(flagsList));
		const flagItem = existingFlags.find((flag) => flag.id === rowId);

		if (!flagItem) return;

		// Save the previous status
		const previousStatus = flagItem.flag || 'white';

		// If status isn't changing, just exit
		if (previousStatus === newFlag) return;

		console.log('Flag change detected:', {
			item: item.attributes.row.name,
			previousStatus,
			newFlag,
		});

		// IMPORTANT: Apply the flag change IMMEDIATELY to the state so it persists
		// even if the user cancels entering a reason
		const updatedFlagsList = flagsList.map((flag) =>
			flag.id === rowId ? { ...flag, flag: newFlag } : flag
		);

		setDealbreaker({
			...dealbreaker,
			[currentProfileId]: {
				...dealbreaker[currentProfileId],
				flag: updatedFlagsList,
			},
		});

		// Store the change details
		const pendingChange = {
			item,
			rowId,
			previousStatus,
			newFlag,
			currentProfileId,
		};

		console.log('Setting pendingFlagChange:', pendingChange);
		setPendingFlagChange(pendingChange);

		// Show reason modal after a short delay to avoid state conflicts
		setTimeout(() => {
			setReasonModalVisible(true);
		}, 100);
	};

	// Handle completing the flag change after getting reason
	const handleFlagChangeWithReason = async (
		reason,
		attachments = [],
		profiles
	) => {
		// Close the reason modal
		setReasonModalVisible(false);

		if (!pendingFlagChange) return;

		const { item, rowId, previousStatus, newFlag, currentProfileId } =
			pendingFlagChange;

		try {
			// Get the current profile name
			const currentProfile = profiles.find(
				(p) => p.id === currentProfileId
			);
			if (!currentProfile) {
				console.error('Current profile not found');
				return;
			}

			// Record the flag status change in history with profile name
			const historyEntry = await addFlagHistory(
				currentProfileId,
				currentProfile.name, // profileName
				rowId, // flagId
				item.attributes.row.name, // flagTitle
				previousStatus,
				newFlag, // newStatus
				reason,
				null, // creatorId
				'flag', // previousCardType - regular flag changes are always flag to flag
				'flag' // newCardType - regular flag changes are always flag to flag
			);

			// Add attachments if any were provided
			if (
				attachments &&
				attachments.length > 0 &&
				historyEntry &&
				historyEntry._id
			) {
				console.log(
					'Adding attachments to history entry:',
					JSON.stringify(attachments)
				);
				console.log('History entry ID:', historyEntry._id);
				console.log(
					'Using addAttachmentToHistory from:',
					typeof addAttachmentToHistory
				);

				// Process each attachment
				for (const attachment of attachments) {
					try {
						console.log(
							'Processing attachment:',
							JSON.stringify(attachment)
						);
						console.log('Attachment type:', attachment.type);
						console.log(
							'Attachment URL:',
							attachment.url?.substring(0, 50) + '...'
						);
						const result = await addAttachmentToHistory(
							historyEntry._id,
							attachment
						);
						console.log('Attachment add result:', result);
					} catch (attachError) {
						console.error('Error adding attachment:', attachError);
					}
				}
			}

			console.log('Successfully recorded flag change with reason');
		} catch (error) {
			console.error('Error updating flag history with reason:', error);
		} finally {
			// Clear pending flag change
			setPendingFlagChange(null);
		}
	};

	// Handle cancelling the flag change - now just cancels history recording
	const handleCancelFlagChange = () => {
		console.log('User cancelled reason input for flag change');
		setReasonModalVisible(false);
		setPendingFlagChange(null);
	};

	// Function to handle viewing flag history
	const handleViewFlagHistory = (item, currentProfileId) => {
		console.log('handleViewFlagHistory called with item:', item);

		// Extract the actual data from the board item if needed
		let flagData = item;

		// Check if this is a board item with attributes structure
		if (item && item.attributes && item.attributes.row) {
			console.log('Converting board item to flag data');
			flagData = item.attributes.row;
		}

		// Log what we're about to set
		console.log('Setting selectedFlag to:', flagData);

		// Set the flag data first
		setSelectedFlag({ ...flagData, currentProfileId });

		// Then immediately set the modal to visible
		setHistoryModalVisible(true);
	};

	// Handle adding additional reason
	const handleOpenAddReasonModal = () => {
		console.log('Opening add reason modal. selectedFlag:', selectedFlag);

		// Close the history modal first
		setHistoryModalVisible(false);
		setDealbreaker((prevDealbreaker) => {
			return { ...prevDealbreaker };
		});
		setAdditionalReasonModalVisible(false);

		// Add a delay to ensure the history modal closes completely before opening the reason modal
		setTimeout(() => {
			// Now open the reason modal
			setAdditionalReasonModalVisible(() => {
				return true;
			});
			console.log('additionalReasonModalVisible set to true');
		}, 1000); // 1000ms delay to allow modal animation to complete
	};

	// Handle adding additional reason
	const handleAddAdditionalReason = async (
		reason,
		attachments = [],
		profiles
	) => {
		console.log('Adding additional reason:', reason);
		setAdditionalReasonModalVisible(false);

		if (!selectedFlag) return;

		try {
			// Get the current profile
			const currentProfile = profiles.find(
				(p) => p.id === selectedFlag.currentProfileId
			);
			if (!currentProfile) {
				console.error('Profile not found');
				return;
			}

			// Add the reason to history
			const historyEntry = await addFlagHistory(
				selectedFlag.currentProfileId,
				currentProfile.name,
				selectedFlag.id,
				selectedFlag.name || selectedFlag.title,
				selectedFlag.flag || 'white', // Current status as both prev and new
				selectedFlag.flag || 'white', // Using same color - this indicates it's just a comment
				reason,
				null, // creatorId
				'flag', // Previous card type
				'flag' // New card type
			);

			// Add attachments if provided
			if (
				attachments &&
				attachments.length > 0 &&
				historyEntry &&
				historyEntry._id
			) {
				console.log(
					'Adding attachments to additional reason:',
					JSON.stringify(attachments)
				);
				console.log(
					'Additional reason history entry ID:',
					historyEntry._id
				);
				for (const attachment of attachments) {
					try {
						console.log(
							'Processing additional reason attachment:',
							JSON.stringify(attachment)
						);
						const result = await addAttachmentToHistory(
							historyEntry._id,
							attachment
						);
						console.log(
							'Additional reason attachment add result:',
							result
						);
					} catch (error) {
						console.error('Error adding attachment:', error);
					}
				}
			}

			console.log('Additional reason added successfully');
		} catch (error) {
			console.error('Error adding additional reason:', error);
		}
	};

	// Create the context value object
	const contextValue = {
		// States
		pendingFlagChange,
		reasonModalVisible,
		selectedFlag,
		historyModalVisible,
		additionalReasonModalVisible,

		// Setters
		setPendingFlagChange,
		setReasonModalVisible,
		setSelectedFlag,
		setHistoryModalVisible,
		setAdditionalReasonModalVisible,

		// Actions
		handleFlagClick,
		handleFlagChangeWithReason,
		handleCancelFlagChange,
		handleViewFlagHistory,
		handleOpenAddReasonModal,
		handleAddAdditionalReason,
	};

	return (
		<FlagContext.Provider value={contextValue}>
			{children}
			{/* <FlagHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        profileId={selectedFlag?.currentProfileId}
        flagId={selectedFlag?.id}
        flagTitle={selectedFlag?.name || selectedFlag?.title || 'Unknown Flag'}
        onAddReason={handleOpenAddReasonModal}
      /> */}
			{/* <ReasonInputModal
        visible={additionalReasonModalVisible}
        onClose={() => setAdditionalReasonModalVisible(false)}
        onSubmit={(reason, attachments) =>
          handleAddAdditionalReason(reason, attachments, profiles || [])
        }
        flagTitle={selectedFlag?.name || selectedFlag?.title || 'Unknown Flag'}
        prevStatus={selectedFlag?.flag || 'white'}
        newStatus={selectedFlag?.flag || 'white'}
        modalTitle='Add Additional Context'
      /> */}
			{/* <ReasonInputModal
        visible={reasonModalVisible}
        onClose={handleCancelFlagChange}
        onSubmit={(reason, attachments) =>
          handleFlagChangeWithReason(reason, attachments, profiles || [])
        }
        flagTitle={
          pendingFlagChange?.item?.attributes?.row?.name || 'Unknown Flag'
        }
        prevStatus={pendingFlagChange?.previousStatus || 'white'}
        newStatus={pendingFlagChange?.newFlag || 'white'}
        modalTitle='Why Are You Changing This Flag?'
      /> */}
		</FlagContext.Provider>
	);
};

export default FlagContext;
