import { router, Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { Alert, Button, useWindowDimensions } from 'react-native';
import { useAuth } from '../../context/Auth';
import SwitchProfileModal from '../../components/SwitchProfileModal';
import { colors } from '../../libs/board/constants';
import { useAuthActions } from '../../hooks/useAuthActions';
import { useDealbreakerSync } from '../../hooks/useDealbreakerSync';
import { useLayoutModals } from '../../hooks/useLayoutModals';
import StoreContext from '../../store';
import { useContext } from 'react';

const Layout = () => {
	const { user } = useAuth();
	console.log('user: ', user);
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
	const { logout } = useAuthActions();
	const {
		switchProfileModalVisible,
		openSwitchProfileModal,
		closeSwitchProfileModal,
	} = useLayoutModals();
	useDealbreakerSync(user);
	const { currentProfileId, setCurrentProfileId, profiles } =
		useContext<any>(StoreContext);
	const isProfileMain = () => currentProfileId === 'main';
	const personName = profiles.find((p: any) => p.id === currentProfileId)?.name;
	const confirmLogout = () =>
		Alert.alert('Log Out', 'Are you sure you want to log out?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Log Out', style: 'destructive', onPress: logout },
		]);
	return (
		<>
			<SwitchProfileModal
				visible={switchProfileModalVisible}
				onClose={closeSwitchProfileModal}
			/>
			<Tabs>
				<Tabs.Screen
					name={'create-flag/index'}
					options={{
						href: isProfileMain() ? '/create-flag' : null,
						headerTitle: 'Create Flag',
						title: 'Create Flag',
						tabBarStyle: {
							display: isProfileMain() ? 'flex' : 'none',
						},
						tabBarIcon: ({ color }) => (
							<Feather
								name='flag'
								size={isPortrait ? 28 : 18}
								color={color as string}
							/>
						),
						tabBarActiveTintColor: colors.exodusFruit,
						headerRight: () => (
							<Button title='Logout' onPress={confirmLogout} />
						),
					}}
				/>
				<Tabs.Screen
					name='index'
					listeners={{
						// On a person's board the Home tab takes you back to Main.
						tabPress: () => {
							if (!isProfileMain()) setCurrentProfileId('main');
						},
					}}
					options={{
						headerTitle: isProfileMain() ? 'Home' : personName || 'Profile',
						title: isProfileMain() ? 'Home' : 'Main',
						tabBarIcon: ({ color }) => (
							<FontAwesome
								name='home'
								color={color as string}
								size={isPortrait ? 28 : 18}
							/>
						),
						tabBarActiveTintColor: colors.exodusFruit,
						headerRight: () => {
							if (user?.role == 'guest') {
								return (
									<Button
										title='Register'
										onPress={() => {
											router.push('/register');
										}}
									/>
								);
							}
							return <Button title='Logout' onPress={confirmLogout} />;
						},
						headerLeft: () => (
							<Button
								title='Switch Profile'
								onPress={openSwitchProfileModal}
							/>
						),
					}}
				/>
				<Tabs.Screen
					name={'create-profile/index'}
					options={{
						href: isProfileMain() ? '/create-profile' : null,
						headerTitle: 'Create Profile',
						title: 'Create Profile',
						tabBarStyle: {
							display: isProfileMain() ? 'flex' : 'none',
						},
						tabBarIcon: ({ color }) => (
							<Feather
								name='user'
								size={isPortrait ? 28 : 18}
								color={color as string}
							/>
						),
						tabBarActiveTintColor: colors.exodusFruit,
						headerRight: () => (
							<Button title='Logout' onPress={confirmLogout} />
						),
					}}
				/>
				<Tabs.Screen
					name={'user-info/index'}
					options={{
						href: isProfileMain() ? '/user-info' : null,
						headerTitle: 'My Account',
						title: 'My Account',
						tabBarStyle: {
							display: isProfileMain() ? 'flex' : 'none',
						},
						tabBarIcon: ({ color }) => (
							<Feather
								name='user'
								size={isPortrait ? 28 : 18}
								color={color as string}
							/>
						),
						tabBarActiveTintColor: colors.exodusFruit,
						headerRight: () => (
							<Button title='Logout' onPress={confirmLogout} />
						),
					}}
				/>
			</Tabs>
		</>
	);
};

export default Layout;
