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
import { addDealbreakers } from '../utils/mongodbapi';
import { setList } from '../utils/storage';

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
	const isMountRef = useRef(false);
	// Saving waits until the server's board has loaded once, so a phone's stale copy can't overwrite it.
	const boardLoadedRef = useRef(false);
	// True once a board is on screen (the phone's copy or the server's); until then the board says it's loading, not empty.
	const [boardReady, setBoardReady] = useState(false);
	const isDealbreakerTimeoutRef = useRef<
		boolean | ReturnType<typeof setTimeout>
	>(false);
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
			setBoardReady
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
	const updateDealbreakers = async () => {
		if (!boardLoadedRef.current) return;
		// The phone keeps a copy so the next launch shows the board at once (useDataLoader).
		setList('dealbreaker', dealbreaker);
		const userData = await SecureStore.getItem('userData');
		if (userData) {
			if (isDealbreakerTimeoutRef.current) {
				clearTimeout(
					isDealbreakerTimeoutRef.current as ReturnType<
						typeof setTimeout
					>
				);
			}
			isDealbreakerTimeoutRef.current = setTimeout(async () => {
				isDealbreakerTimeoutRef.current = false;
				const userDataObject = JSON.parse(userData);
				const userId = userDataObject.id;
				await addDealbreakers(dealbreaker, userId);
			}, 1000);
		}
	};

	useEffect(() => {
		if (isMountRef.current) {
			updateDealbreakers();
		}
		isMountRef.current = true;
	}, [dealbreaker]);

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
