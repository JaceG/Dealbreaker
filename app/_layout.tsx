import { SplashScreen, Stack } from 'expo-router';
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
	ProfileData,
	DealbreakerState,
	Profile,
} from '../models/boardManagementModel';

// Make Buffer available globally
(global as any).Buffer = Buffer;

import * as SecureStore from 'expo-secure-store';
import { useState, useRef, useEffect } from 'react';
import StoreContext from '../store';
import Toast from 'react-native-toast-message';
import { FlagProvider } from '../context/FlagContext';
import { AuthProvider } from '../context/Auth';
import { setAtomicValue, getAtomicValue, clearStorage } from '../utils';
import { addDealbreakers, getDealbreakers } from '../utils/mongodbapi';
import { AuthContextType } from '../models/authModels';

// Update component props types
interface ComponentProps {
	[key: string]: any;
}

const Lists = (props: { navigation?: any; route?: any }) => null;
const CreateFlags = (props: { navigation?: any; route?: any }) => null;
const CreateProfiles = (props: { navigation?: any; route?: any }) => null;

// Fix component props type
interface ProfileComponentProps {
	navigation?: any;
	route?: any;
	onLogout?: () => void;
}

const ProfileScreen = (props: ProfileComponentProps) => null;

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
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const isDealbreakerMountRef = useRef(false);
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
	const { isLoaded, updateDealbreaker, synchronizeProfileFlags } =
		useDataLoader(
			dealbreaker,
			setDealbreaker,
			profiles,
			setProfiles,
			currentProfileId,
			setCurrentProfileId,
			debugLog,
			syncOfflineData
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
	} = useProfileManager(
		dealbreaker,
		updateDealbreaker,
		profiles,
		setProfiles,
		currentProfileId,
		setCurrentProfileId
	);
	const checkIsLoggedIn = async () => {
		const token = await getAtomicValue('authToken');
		console.warn('token: ', token);
		if (token) {
			setIsAuthenticated(true);
		} else {
			setIsAuthenticated(false);
		}
	};
	const updateDealbreakers = async () => {
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
		updateDealbreakers();
	}, [dealbreaker]);

	useEffect(() => {
		checkIsLoggedIn();
	}, []);

	// Main content with drawer navigation
	useEffect(() => {
		if (isAuthenticated) {
			isDealbreakerMountRef.current = false;
		}
	}, [isAuthenticated]);

	useEffect(() => {
		SplashScreen.hideAsync();
	}, []);

	return (
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
					ensureProfileExists,
					isOnline,
					syncData: syncOfflineData,
				} as any
			}>
			<AuthProvider>
				<FlagProvider
					profiles={profiles}
					setDealbreaker={setDealbreaker}>
					<Stack>
						<Stack.Screen
							name='index'
							options={{
								headerTitle: 'Login',
								title: 'Login',
							}}
						/>
						<Stack.Screen
							name='login/index'
							options={{
								headerTitle: 'Login',
								title: 'Login',
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
							}}
						/>
					</Stack>
				</FlagProvider>
			</AuthProvider>
			<Toast />
		</StoreContext.Provider>
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
		removeItemFromAllProfiles: (
			itemId: string,
			type: 'flag' | 'dealbreaker'
		) => void;
		createProfile: (name: string) => string;
		deleteProfile: (profileId: string) => boolean;
		renameProfile: (profileId: string, newName: string) => void;
		ensureProfileExists: (profileId: string) => boolean;
		isOnline: boolean;
		syncData: (forceSync?: boolean) => Promise<void>;
	}
}

export default Layout;
