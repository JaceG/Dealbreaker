import { SplashScreen, Stack } from 'expo-router';
import * as NativeSplash from 'expo-splash-screen';
// Add polyfills for React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { useConsoleManager } from '../hooks/useConsoleManager';
import { useDataLoader } from '../hooks/useDataLoader';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { useProfileManager } from '../hooks/useProfileManager';

// Import centralized types
import {
	FlagItem,
	DealbreakerState,
	Profile,
} from '../models/boardManagementModel';

// Make Buffer available globally
(global as any).Buffer = Buffer;

// The native splash fades into app/index, which looks the same, so the heart never blinks while it loads.
NativeSplash.setOptions({ fade: true });

import * as SecureStore from 'expo-secure-store';
import { useState, useRef, useEffect } from 'react';
import StoreContext from '../store';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlagProvider } from '../context/FlagContext';
import { AuthProvider } from '../context/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDealbreakers } from '../utils/mongodbapi';
import { setAtomicValue } from '../utils/storage';

const Layout = () => {
	const { debugLog } = useConsoleManager();

	const [dealbreaker, setDealbreaker] = useState<DealbreakerState>({
		main: {
			flag: [],
			dealbreaker: [],
		},
	});

	const [profiles, setProfiles] = useState<Profile[]>([
		{ id: 'main', name: 'Main Profile' },
	]);
	const [currentProfileId, setCurrentProfileId] = useState('main');
	// True once a server answer has come in (applied, or skipped for unsaved changes); logout resets it.
	const boardLoadedRef = useRef(false);
	// True once a board is on screen (the phone's copy or the server's); until then the board says it's loading, not empty.
	const [boardReady, setBoardReady] = useState(false);
	// account: whose board is on screen. serverJson: that board as the server last had it (its answer, or our last save
	// that went through); a board on screen that differs is unsaved. unsavedBy: the account whose changes those are.
	// saves: counts saves that went through. saving: a save is out. Logout and sign-in replace the whole object.
	const newBoardSync = () => ({
		account: null as string | null,
		serverJson: null as string | null,
		unsavedBy: null as string | null,
		saves: 0,
		saving: false,
	});
	const boardSyncRef = useRef(newBoardSync());
	const dealbreakerRef = useRef(dealbreaker);
	dealbreakerRef.current = dealbreaker;
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Network sync hook
	const { isOnline, syncOfflineData } = useNetworkSync(
		setProfiles,
		setDealbreaker,
		debugLog
	);

	// Data loader hook
	const { updateDealbreaker } =
		useDataLoader(
			dealbreaker,
			setDealbreaker,
			profiles,
			setProfiles,
			currentProfileId,
			setCurrentProfileId,
			debugLog,
			syncOfflineData,
			boardLoadedRef,
			setBoardReady,
			boardSyncRef
		);

	// Profile manager hook
	const {
		ensureProfileExists,
		addItemToProfile,
		addItemToAllProfiles,
		removeItemFromProfile,
		removeItemFromAllProfiles,
		createProfile,
		deleteProfile,
		renameProfile,
		setProfileEnded,
		isValidNoCardItems,
		isValidNoProfileItems,
	} = useProfileManager(
		dealbreaker,
		updateDealbreaker,
		profiles,
		setProfiles,
		currentProfileId,
		setCurrentProfileId
	);
	const signedInId = (): string | null => {
		const userData = SecureStore.getItem('userData');
		return userData ? JSON.parse(userData).id : null;
	};

	// Sends the board on screen until the server has it: one save at a time, and a failed one tries again in 15 s.
	const saveBoard = (delay: number) => {
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(async () => {
			saveTimerRef.current = null;
			const sync = boardSyncRef.current;
			if (sync.saving) return saveBoard(1000);
			const owner = sync.unsavedBy;
			// Nothing unsaved, or signed out / into another account since: never send one account's board to another.
			if (!owner || signedInId() !== owner) return;
			const board = dealbreakerRef.current;
			// Read with the account check: sign-in stores the new login before its account, so a token read later could be another account's.
			const token = SecureStore.getItem('authToken');
			if (!token) return;
			sync.saving = true;
			const saved = await addDealbreakers(board, owner, token);
			sync.saving = false;
			// Logout replaces boardSyncRef: what happens to this save no longer matters.
			if (sync !== boardSyncRef.current || signedInId() !== owner) return;
			if (saved) {
				sync.serverJson = JSON.stringify(board);
				sync.saves++;
				// Changes made while it was out (an undo too) can differ from what was just saved: send those next.
				sync.unsavedBy =
					JSON.stringify(dealbreakerRef.current) === sync.serverJson ? null : owner;
				setAtomicValue('boardUnsaved', sync.unsavedBy || '');
				if (sync.unsavedBy && !saveTimerRef.current) saveBoard(1000);
			} else if (!saveTimerRef.current) {
				saveBoard(15000);
			}
		}, delay);
	};

	useEffect(() => {
		// Before a board is on screen (or after logout) there's nothing to keep: an edit to the empty board would
		// replace the whole saved one.
		if (!boardReady) return;
		const sync = boardSyncRef.current;
		// Only the account whose board this is: after a switch without logout (a guest's Register, then Sign in), the
		// old board stays up until the new account's answer, and changes to it must not be saved under that account.
		sync.unsavedBy =
			JSON.stringify(dealbreaker) !== sync.serverJson && sync.account === signedInId()
				? sync.account
				: null;
		// The phone keeps a copy so the next launch shows the board at once (useDataLoader), marked while the server
		// lacks it. One write, so the copy and its mark can't disagree.
		AsyncStorage.multiSet([
			['dealbreaker', JSON.stringify(dealbreaker)],
			['boardUnsaved', sync.unsavedBy || ''],
		]).catch(console.log);
		// The 1 s wait gathers quick repeats into one save.
		if (sync.unsavedBy) saveBoard(1000);
	}, [dealbreaker]);

	// Back online: send unsaved changes now, not at the next 15 s retry.
	useEffect(() => {
		if (isOnline && boardSyncRef.current.unsavedBy) saveBoard(0);
	}, [isOnline]);

	useEffect(() => {
		SplashScreen.hideAsync();
	}, []);

	return (
		// Gestures (timeline pinch-to-zoom, chart tap-to-inspect) need this at the root.
		<GestureHandlerRootView style={{ flex: 1 }}>
		<StoreContext.Provider
			value={
				{
					dealbreaker,
					setDealbreaker,
					profiles,
					setProfiles,
					currentProfileId,
					setCurrentProfileId,
					addItemToProfile,
					addItemToAllProfiles,
					removeItemFromProfile,
					removeItemFromAllProfiles,
					createProfile,
					deleteProfile,
					renameProfile,
					setProfileEnded,
					ensureProfileExists,
					boardLoadedRef,
					boardSyncRef,
					resetBoardSync: () => {
						boardSyncRef.current = newBoardSync();
					},
					boardReady,
					setBoardReady,
					isOnline,
					syncData: syncOfflineData,
					isValidNoCardItems,
					isValidNoProfileItems,
				} as any
			}>
			<AuthProvider>
				<FlagProvider
					profiles={profiles}
					setDealbreaker={setDealbreaker as any}>
					<Stack>
						<Stack.Screen name='index' options={{ headerShown: false }} />
						<Stack.Screen
							name='login/index'
							options={{
								headerTitle: 'Login',
								title: 'Login',
								animation: 'fade', // out of the launch splash
							}}
						/>
						<Stack.Screen
							name='register/index'
							options={{
								headerTitle: 'Register',
								title: 'Register',
							}}
						/>
						<Stack.Screen
							name='(tabs)'
							options={{
								headerShown: false,
								headerTitle: 'Back',
								animation: 'fade', // out of the launch splash
							}}
						/>
					</Stack>
				</FlagProvider>
			</AuthProvider>
			<Toast />
		</StoreContext.Provider>
		</GestureHandlerRootView>
	);
};

// Add this right after the StoreContext import
// Override StoreContext type to match our interfaces
// You should update the actual store.ts file with the proper types later
declare module '../store' {
	interface StoreContextType {
		dealbreaker: DealbreakerState;
		setDealbreaker: React.Dispatch<React.SetStateAction<DealbreakerState>>;
		profiles: Profile[];
		setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
		currentProfileId: string;
		setCurrentProfileId: React.Dispatch<React.SetStateAction<string>>;
		addItemToProfile: (
			profileId: string,
			item: FlagItem,
			type: 'flag' | 'dealbreaker'
		) => void;
		addItemToAllProfiles: (
			item: FlagItem,
			type: 'flag' | 'dealbreaker'
		) => void;
		removeItemFromProfile: (
			profileId: string,
			itemId: string,
			type: 'flag' | 'dealbreaker'
		) => void;
		removeItemFromAllProfiles: (itemId: string) => void;
		createProfile: (name: string) => string;
		deleteProfile: (profileId: string) => boolean;
		renameProfile: (profileId: string, newName: string) => boolean;
		setProfileEnded: (profileId: string, ended: boolean) => void;
		ensureProfileExists: (profileId: string) => boolean;
		isOnline: boolean;
		syncData: (forceSync?: boolean) => Promise<void>;
	}
}

export default Layout;
