import { useState, useRef, useEffect } from 'react';
import { BoardRepository } from '../../libs/board/components';
import { data } from '../../models/boardManagementModel';
import { showToast } from '../../utils/functions';
import { useFlagContext } from '../../context/FlagContext';

export const useBoardOperations = (
	dealbreaker: any,
	currentProfileId: string,
	ensureProfileExists: (profileId: string) => boolean,
	params: any,
	handleViewFlagHistory?: (item: any) => void
) => {
	// Board state
	const [list, setList] = useState<BoardRepository | null>(null);
	const [isRemount, setIsRemount] = useState(false);
	const [refreshKey, setRefreshKey] = useState(Date.now());

	// Board refs
	const flagListIndexRef = useRef<Map<string, number>>(new Map());
	const skipUpdateRef = useRef(false);
	const dealbreakerListIndexRef = useRef<Map<string, number>>(new Map());
	const isMountRef = useRef(false);

	// Add this debug function to help track what's happening with flag colors
	const logProfileFlags = (label: string) => {
		console.log(
			`${label} - Profile ${currentProfileId} flags:`,
			dealbreaker[currentProfileId]?.flag
		);
	};

	// Helper function to ensure current profile exists
	const ensureCurrentProfileExists = () => {
		// Safety checks for initial render
		if (!dealbreaker) return false;
		if (!currentProfileId) return false;

		// Check if the profile already exists
		if (dealbreaker[currentProfileId]) return false;

		console.log('Creating missing profile in Lists:', currentProfileId);

		// Use the store's ensureProfileExists function
		return ensureProfileExists(currentProfileId);
	};

	const reloadBoard = () => {
		// Check if we have items to display
		const hasItems =
			dealbreaker?.[currentProfileId]?.flag?.length > 0 ||
			dealbreaker?.[currentProfileId]?.dealbreaker?.length > 0;

		// Only update board if we have items and required conditions are met
		if (hasItems && !skipUpdateRef.current && isMountRef.current) {
			console.log('updateBoard');
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
			const {
				flag: newFlags = [],
				dealbreaker: newDealbreakerList = [],
			} = forceData[currentProfileId];
			flag = newFlags;
			dealbreakerList = newDealbreakerList;
		} else {
			// Get data from current profile with defaults for safety
			const {
				flag: newFlags = [],
				dealbreaker: newDealbreakerList = [],
			} = dealbreaker[currentProfileId];
			flag = newFlags;
			dealbreakerList = newDealbreakerList;
		}

		console.log('current flag', { flag });
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
				flag: item.flag || 'white', // Preserve the original flag color but default to white if missing
				// Note: onLongPress calls handleViewFlagHistory
				onLongPress: () => {
					console.log('Long press on flag item:', item.id);
					if (handleViewFlagHistory) {
						handleViewFlagHistory(item);
					}
				},
			};
		});

		// Map dealbreakers to board rows
		newData[1].rows = cleanDealbreakers.map((item: any, index: number) => {
			dealbreakerListIndexRef.current.set(item.id, index);
			return {
				id: item.id,
				name: item.title,
				description: item.description,
				flag: item.flag || 'white', // Preserve the original flag color but default to white if missing
				// Note: onLongPress calls handleViewFlagHistory
				onLongPress: () => {
					console.log('Long press on dealbreaker item:', item.id);
					if (handleViewFlagHistory) {
						handleViewFlagHistory(item);
					}
				},
			};
		});

		// Set the board with the processed data
		setList(new BoardRepository(newData));
	};

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

			// Return the updated data for the consumer to handle state updates
			updatedDealbreaker[currentProfileId].flag = cleanFlagsList;
			return updatedDealbreaker;
		}

		return null; // No duplicates found
	};

	// Effects for board management
	useEffect(() => {
		// Log flag colors whenever currentProfileId changes
		logProfileFlags(`Profile changed to ${currentProfileId}`);

		// Run duplicate cleanup when profile changes
		if (dealbreaker && currentProfileId && dealbreaker[currentProfileId]) {
			const cleanedData = cleanupDuplicates();
			if (cleanedData) {
				// Consumer should handle this update
				console.log('Duplicates found and cleaned');
			}
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

	return {
		// Board state
		list,
		setList,
		isRemount,
		setIsRemount,
		refreshKey,
		setRefreshKey,

		// Board refs
		flagListIndexRef,
		dealbreakerListIndexRef,
		skipUpdateRef,
		isMountRef,

		// Board functions
		updateBoard,
		reloadBoard,
		cleanupDuplicates,
		logProfileFlags,
		ensureCurrentProfileExists,
	};
};

export const useFlagHistory = (currentProfileId: string) => {
	const { handleViewFlagHistory: contextHandleViewFlagHistory } =
		useFlagContext() as any;

	const handleViewFlagHistory = (item: any) => {
		contextHandleViewFlagHistory(item, currentProfileId);
	};

	return { handleViewFlagHistory };
};
