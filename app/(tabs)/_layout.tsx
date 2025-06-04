import { router, Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { Button } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const Layout = () => {
	async function clearSecureStore() {
		const keys = ['authToken', 'userData'];
		for (const key of keys) {
			await SecureStore.deleteItemAsync(key);
		}
	}

	const logout = async () => {
		await clearSecureStore();
		router.replace('/login');
	};

	return (
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
	);
};

export default Layout;
