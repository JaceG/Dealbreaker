import { router, Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Alert, useWindowDimensions } from 'react-native';
import { useAuth } from '../../context/Auth';
import SwitchProfileModal from '../../components/SwitchProfileModal';
import { colors } from '../../libs/board/constants';
import { useDealbreakerSync } from '../../hooks/useDealbreakerSync';
import { useLayoutModals } from '../../hooks/useLayoutModals';
import StoreContext from '../../store';
import { useContext } from 'react';

const Layout = () => {
	const { user } = useAuth();
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
	const {
		switchProfileModalVisible,
		openSwitchProfileModal,
		closeSwitchProfileModal,
	} = useLayoutModals();
	useDealbreakerSync(user);
	const { currentProfileId, setCurrentProfileId } = useContext<any>(StoreContext);
	const isProfileMain = () => currentProfileId === 'main';
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
			<Tabs screenOptions={{ tabBarActiveTintColor: colors.ink }}>
				<Tabs.Screen
					name='index'
					listeners={{
						// On a person's board the Main tab takes you back to Main.
						tabPress: () => {
							if (!isProfileMain()) setCurrentProfileId('main');
						},
					}}
					options={{
						// The board screen sets its own header title and buttons.
						title: 'Main',
						tabBarIcon: ({ color }) => (
							<Feather name='home' size={iconSize} color={color as string} />
						),
					}}
				/>
				<Tabs.Screen
					name={'create-profile/index'}
					listeners={{
						// People opens the People sheet instead of this screen; people are added in the sheet.
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
