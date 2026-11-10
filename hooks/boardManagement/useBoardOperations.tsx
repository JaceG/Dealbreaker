import { useState, useRef, useEffect } from 'react';
import { BoardRepository } from '../../libs/board/components';
import { data } from '../../models/boardManagementModel';
import { boardLog } from '../../utils/boardLog';
import { isDragging, onDragIdle } from '../../libs/board/components/lib/dragState';

export const useBoardOperations = (
	dealbreaker: any,
	currentProfileId: string,
	ensureProfileExists: (profileId: string) => boolean,
	params: any,
	handleViewFlagHistory?: (item: any) => void,
	colorFilter: string | null = null,
	historyCounts: Record<string, number> = {}
) => {
	// Board rebuilds can come from timers set in an earlier render, so they read the filter and counts from here.
	const colorFilterRef = useRef(colorFilter);
	colorFilterRef.current = colorFilter;
	const historyCountsRef = useRef(historyCounts);
	historyCountsRef.current = historyCounts;
	// Board state
	const [list, setList] = useState<BoardRepository | null>(null);
	const [isRemount, setIsRemount] = useState(false);
	const [refreshKey, setRefreshKey] = useState(Date.now());

	// Board refs
	const flagListIndexRef = useRef<Map<string, number>>(new Map());
	const skipUpdateRef = useRef(false);
	const dealbreakerListIndexRef = useRef<Map<string, number>>(new Map());
	const isMountRef = useRef(false);
	const currentProfileIdRef = useRef(currentProfileId);
	currentProfileIdRef.current = currentProfileId;

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
		// A rebuild scheduled before a person switch would tag the board with the person just left.
		if (currentProfileIdRef.current !== currentProfileId) return;
		boardLog('board.update', { force, forceData: !!forceData, profile: currentProfileId });
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

		// On Main, how many active people have each card yellow, red or as a dealbreaker.
		const source = forceData || dealbreaker;
		const peopleCounts = (cardId: string) => {
			if (currentProfileId !== 'main') return undefined;
			const counts = { yellow: 0, red: 0, dealbreaker: 0 };
			Object.entries(source || {}).forEach(([id, person]: [string, any]) => {
				if (id === 'main' || person?.ended) return;
				if (person?.dealbreaker?.some((c: any) => c.id === cardId)) counts.dealbreaker++;
				const flag = person?.flag?.find((c: any) => c.id === cardId)?.flag;
				if (flag === 'yellow' || flag === 'red') counts[flag as 'yellow' | 'red']++;
			});
			return counts;
		};

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
				historyCount: historyCountsRef.current[item.id] || 0,
				peopleCounts: peopleCounts(item.id),
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
				historyCount: historyCountsRef.current[item.id] || 0,
				peopleCounts: peopleCounts(item.id),
				// Note: onLongPress calls handleViewFlagHistory
				onLongPress: () => {
					console.log('Long press on dealbreaker item:', item.id);
					if (handleViewFlagHistory) {
						handleViewFlagHistory(item);
					}
				},
			};
		});

		// The overview's color filter hides other flags; the index maps above still hold full-list positions.
		if (colorFilterRef.current) {
			newData[0].rows = newData[0].rows.filter(
				(row: any) => row.flag === colorFilterRef.current
			);
		}

		// Set the board with the processed data, tagged with whose board it is, so the screen never draws
		// one person's cards under another person's header for a frame after a switch.
		const board = new BoardRepository(newData);
		(board as any).profileId = currentProfileId;
		setList(board);
	};

	// Columns re-register when handed a new board repository, so new data no longer needs a remount.
	// Note counts arrive from the server a moment after launch and after each note; rebuilding then would
	// tear the board down under a lifted card, so that rebuild waits for the drop.
	const rebuildHeldRef = useRef(false);
	const [dragIdleTick, setDragIdleTick] = useState(0);
	useEffect(() => onDragIdle(() => setDragIdleTick((n) => n + 1)), []);
	useEffect(() => {
		if (!dealbreaker?.[currentProfileId]) return;
		if (isDragging()) {
			rebuildHeldRef.current = true;
			boardLog('board.rebuildHeld', { reason: 'note counts or filter changed during a drag' });
			return;
		}
		updateBoard(true);
		setRefreshKey(Date.now());
	}, [colorFilter, historyCounts]);
	useEffect(() => {
		if (!rebuildHeldRef.current) return;
		rebuildHeldRef.current = false;
		boardLog('board.rebuildReleased', {});
		updateBoard(true);
		setRefreshKey(Date.now());
	}, [dragIdleTick]);

	// Effects for board management
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

		// No blanking here: the effect below rebuilds the board for the new person right away.
		boardLog('board.personSwitch', { profile: currentProfileId });
	}, [currentProfileId]);

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
		logProfileFlags,
		ensureCurrentProfileExists,
	};
};
