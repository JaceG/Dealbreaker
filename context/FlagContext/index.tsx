import React, { createContext, useContext, useState, ReactNode } from 'react';
// Import directly from implementation files to bypass index.js
import { addFlagHistory } from '../../utils/mongodb/index';

// Type definitions
interface Profile {
	id: string;
	name: string;
}

interface FlagItem {
	id: string;
	name?: string;
	title?: string;
	description?: string;
	flag: string;
}

interface BoardItem {
	attributes: {
		row: FlagItem;
	};
}

interface Attachment {
	type: string;
	url: string;
}

interface PendingFlagChange {
	item: BoardItem;
	rowId: string;
	previousStatus: string;
	newFlag: string;
	currentProfileId: string;
}

interface SelectedFlag extends FlagItem {
	currentProfileId: string;
}

interface Dealbreaker {
	[profileId: string]: {
		flag: FlagItem[];
	};
}

interface FlagContextType {
	// States
	pendingFlagChange: PendingFlagChange | null;
	reasonModalVisible: boolean;
	selectedFlag: SelectedFlag | null;
	historyModalVisible: boolean;
	additionalReasonModalVisible: boolean;

	// Setters
	setPendingFlagChange: (change: PendingFlagChange | null) => void;
	setReasonModalVisible: (visible: boolean) => void;
	setSelectedFlag: (flag: SelectedFlag | null) => void;
	setHistoryModalVisible: (visible: boolean) => void;
	setAdditionalReasonModalVisible: (visible: boolean) => void;

	// Actions
	handleFlagClick: (
		newFlag: string,
		item: BoardItem,
		dealbreaker: Dealbreaker,
		currentProfileId: string,
		setDealbreaker: (dealbreaker: Dealbreaker) => void
	) => void;
	handleFlagChangeWithReason: (
		reason: string,
		attachments?: Attachment[],
		profiles?: Profile[]
	) => Promise<void>;
	handleCancelFlagChange: () => void;
	handleViewFlagHistory: (
		item: BoardItem | FlagItem,
		currentProfileId: string
	) => void;
	handleOpenAddReasonModal: () => void;
	handleAddAdditionalReason: (
		reason: string,
		attachments?: Attachment[],
		profiles?: Profile[]
	) => Promise<void>;
}

interface FlagProviderProps {
	children: ReactNode;
	profiles: Profile[];
	setDealbreaker: (
		dealbreaker: Dealbreaker | ((prev: Dealbreaker) => Dealbreaker)
	) => void;
}

// Create the context
const FlagContext = createContext<FlagContextType | undefined>(undefined);

// Custom hook to use the flag context
export const useFlagContext = () => {
	const context = useContext(FlagContext);
	if (context === undefined) {
		throw new Error('useFlagContext must be used within a FlagProvider');
	}
	return context;
};

export const FlagProvider = ({
	children,
	profiles,
	setDealbreaker,
}: FlagProviderProps) => {
	// States for flag changes
	const [pendingFlagChange, setPendingFlagChange] =
		useState<PendingFlagChange | null>(null);
	const [reasonModalVisible, setReasonModalVisible] = useState(false);

	// For FlagHistory Modal
	const [selectedFlag, setSelectedFlag] = useState<SelectedFlag | null>(null);
	const [historyModalVisible, setHistoryModalVisible] = useState(false);
	const [additionalReasonModalVisible, setAdditionalReasonModalVisible] =
		useState(false);

	// Function to handle flag click and show reason modal
	const handleFlagClick = (
		newFlag: string,
		item: BoardItem,
		dealbreaker: Dealbreaker,
		currentProfileId: string,
		setDealbreaker: (dealbreaker: Dealbreaker) => void
	) => {
		// If not current profile or item data is missing, exit early
		if (!dealbreaker?.[currentProfileId]?.flag || !item?.attributes?.row)
			return;

		const rowId = item.attributes.row.id;
		const flagsList = dealbreaker[currentProfileId].flag;

		// Get the current flag item to determine previous status
		const existingFlags = JSON.parse(JSON.stringify(flagsList));
		const flagItem = existingFlags.find(
			(flag: FlagItem) => flag.id === rowId
		);

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
		const updatedFlagsList = flagsList.map((flag: FlagItem) =>
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
		const pendingChange: PendingFlagChange = {
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
		reason: string,
		attachments: Attachment[] = [],
		profiles: Profile[] = []
	) => {
		// Close the reason modal
		setReasonModalVisible(false);

		if (!pendingFlagChange) return;

		const { item, rowId, previousStatus, newFlag, currentProfileId } =
			pendingFlagChange;

		try {
			// Get the current profile name
			const currentProfile = profiles.find(
				(p: Profile) => p.id === currentProfileId
			);
			if (!currentProfile) {
				console.error('Current profile not found');
				return;
			}

			// Record the flag status change in history with profile name
			await addFlagHistory(
				currentProfileId,
				currentProfile.name, // profileName
				rowId, // flagId
				item.attributes.row.name as string, // flagTitle
				previousStatus,
				newFlag, // newStatus
				reason,
				null, // creatorId
				'flag', // previousCardType - regular flag changes are always flag to flag
				'flag', // newCardType - regular flag changes are always flag to flag,
				attachments
			);



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
	const handleViewFlagHistory = (
		item: BoardItem | FlagItem,
		currentProfileId: string
	) => {
		console.log('handleViewFlagHistory called with item:', item);

		// Extract the actual data from the board item if needed
		let flagData: FlagItem = item as FlagItem;

		// Check if this is a board item with attributes structure
		if ('attributes' in item && item.attributes && item.attributes.row) {
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
		setDealbreaker((prevDealbreaker: Dealbreaker): Dealbreaker => {
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
		reason: string,
		attachments: Attachment[] = [],
		profiles: Profile[] = []
	) => {
		console.log('Adding additional reason:', reason);
		setAdditionalReasonModalVisible(false);

		if (!selectedFlag) return;

		try {
			// Get the current profile
			const currentProfile = profiles.find(
				(p: Profile) => p.id === selectedFlag.currentProfileId
			);
			if (!currentProfile) {
				console.error('Profile not found');
				return;
			}

			console.log('Step 2 [attachments: data]', { attachments });

			// Add the reason to history
			await addFlagHistory(
				selectedFlag.currentProfileId,
				currentProfile.name,
				selectedFlag.id,
				(selectedFlag.name || selectedFlag.title) as string,
				selectedFlag.flag || 'white', // Current status as both prev and new
				selectedFlag.flag || 'white', // Using same color - this indicates it's just a comment
				reason,
				null, // creatorId
				'flag', // Previous card type
				'flag', // New card type,
				attachments
			);


			console.log('Additional reason added successfully');
		} catch (error) {
			console.error('Error adding additional reason:', error);
		}
	};

	// Create the context value object
	const contextValue: FlagContextType = {
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
		</FlagContext.Provider>
	);
};

export default FlagContext;
