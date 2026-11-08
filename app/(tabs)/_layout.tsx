import { router, Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { Alert, Button, useWindowDimensions } from 'react-native';
import { useAuth } from '../../context/Auth';
import SwitchProfileModal from '../../components/SwitchProfileModal';
import { colors } from '../../libs/board/constants';
import { useDealbreakerSync } from '../../hooks/useDealbreakerSync';
import { useLayoutModals } from '../../hooks/useLayoutModals';
import StoreContext from '../../store';
import { useContext } from 'react';

const Layout = () => {
	const { user } = useAuth();
	console.log('user: ', user);
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
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
	// Flags are made on Main only: from a person's board the Create Flag tab offers to switch first.
	const createFlagFromProfile = () =>
		Alert.alert(
			'Flags Are Made on Main',
			'New flags go on your Main profile and then appear on everyone. Switch to Main to create one?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Switch to Main',
					onPress: () => {
						setCurrentProfileId('main');
						router.navigate('/create-flag');
					},
				},
			]
		);
	const iconSize = isPortrait ? 28 : 18;
	return (
		<>
			<SwitchProfileModal
				visible={switchProfileModalVisible}
				onClose={closeSwitchProfileModal}
			/>
			<Tabs screenOptions={{ tabBarActiveTintColor: colors.blurple }}>
				<Tabs.Screen
					name='index'
					listeners={{
						// On a person's board the Main tab takes you back to Main.
						tabPress: () => {
							if (!isProfileMain()) setCurrentProfileId('main');
						},
					}}
					options={{
						headerTitle: isProfileMain() ? 'Main' : personName || 'Profile',
						title: 'Main',
						tabBarIcon: ({ color }) => (
							<FontAwesome name='home' color={color as string} size={iconSize} />
						),
						headerRight: () =>
							user?.role == 'guest' ? (
								<Button title='Register' onPress={() => router.push('/register')} />
							) : null,
					}}
				/>
				<Tabs.Screen
					name={'create-profile/index'}
					listeners={{
						// People opens the switcher; its New Person button leads to this screen.
						tabPress: (e) => {
							e.preventDefault();
							openSwitchProfileModal();
						},
					}}
					options={{
						headerTitle: 'New Person',
						title: 'People',
						tabBarIcon: ({ color }) => (
							<Feather name='users' size={iconSize} color={color as string} />
						),
					}}
				/>
				<Tabs.Screen
					name={'stats/index'}
					options={{
						headerTitle: 'Stats',
						title: 'Stats',
						tabBarIcon: ({ color }) => (
							<Feather name='bar-chart-2' size={iconSize} color={color as string} />
						),
					}}
				/>
				<Tabs.Screen
					name={'create-flag/index'}
					listeners={{
						tabPress: (e) => {
							if (isProfileMain()) return;
							e.preventDefault();
							createFlagFromProfile();
						},
					}}
					options={{
						headerTitle: 'Create Flag',
						title: 'Create Flag',
						tabBarIcon: ({ color }) => (
							<Feather name='flag' size={iconSize} color={color as string} />
						),
					}}
				/>
				<Tabs.Screen
					name={'user-info/index'}
					options={{
						headerTitle: 'Settings',
						title: 'Settings',
						tabBarIcon: ({ color }) => (
							<Feather name='settings' size={iconSize} color={color as string} />
						),
					}}
				/>
			</Tabs>
		</>
	);
};

export default Layout;
