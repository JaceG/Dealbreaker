import { router, Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { Button } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { clearKeys } from '../../utils/storage';
import { useContext, useEffect, useRef, useState } from 'react';
import { DealbreakerState } from '../_layout';
import StoreContext from '../../store';
import { AuthContextType } from '../login';
import { useAuth } from '../../context/Auth';
import { getDealbreakers } from '../../utils/mongodbapi';
import SwitchProfileModal from '../../components/SwitchProfileModal';
const Layout = () => {
	const [visible, setVisible] = useState(false);
	const { setDealbreaker } = useContext<any>(StoreContext);
	const { clearAuth, user } = useAuth() as AuthContextType;
	const isDealbreakerTimeoutRef = useRef<
		boolean | ReturnType<typeof setTimeout>
	>(false);
	async function clearSecureStore() {
		const keys = ['authToken', 'userData'];
		for (const key of keys) {
			await SecureStore.deleteItemAsync(key);
			await clearKeys(['dealbreaker', 'profiles']);
			clearAuth();
			setDealbreaker({
				main: {
					flag: [],
					dealbreaker: [],
				},
			});
		}
	}

	const fetchDealbreakers = async () => {
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
				const response = await getDealbreakers(userId);
				if (response) {
					setDealbreaker(response);
				}
			}, 1000);
		}
	};

	useEffect(() => {
		if (user) {
			fetchDealbreakers();
		}
	}, [user]);

	const logout = async () => {
		await clearSecureStore();
		setTimeout(() => {
			try {
				router.replace('/login/');
			} catch (error) {
				console.log('Navigation error during logout:', error);
				// Fallback - try again after a longer delay
				setTimeout(() => {
					router.replace('/login/');
				}, 500);
			}
		}, 200);
	};

	return (
		<>
			<SwitchProfileModal
				visible={visible}
				onClose={() => setVisible(false)}
			/>
			<Tabs>
				<Tabs.Screen
					name='index'
					options={{
						headerTitle: 'Home',
						title: 'Home',
						tabBarIcon: ({ color }) => (
							<FontAwesome name='home' color={color} size={28} />
						),
						headerRight: () => (
							<Button title='Logout' onPress={logout} />
						),
						headerLeft: () => (
							<Button
								title='Switch Profile'
								onPress={() => setVisible(true)}
							/>
						),
					}}
				/>
				<Tabs.Screen
					name='create-flag/index'
					options={{
						headerTitle: 'Create Flag',
						title: 'Create Flag',
						tabBarIcon: ({ color }) => (
							<Feather name='flag' size={28} color={color} />
						),
						headerRight: () => (
							<Button title='Logout' onPress={logout} />
						),
					}}
				/>
				<Tabs.Screen
					name='create-profile/index'
					options={{
						headerTitle: 'Create Profile',
						title: 'Create Profile',
						tabBarIcon: ({ color }) => (
							<Feather name='user' size={28} color={color} />
						),
						headerRight: () => (
							<Button title='Logout' onPress={logout} />
						),
					}}
				/>
			</Tabs>
		</>
	);
};

export default Layout;
