import { router, Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { Button, useWindowDimensions } from 'react-native';
import { AuthContextType } from '../../models/authModels';
import { useAuth } from '../../context/Auth';
import SwitchProfileModal from '../../components/SwitchProfileModal';
import { colors } from '../../libs/board/constants';
import { useAuthActions } from '../../hooks/useAuthActions';
import { useDealbreakerSync } from '../../hooks/useDealbreakerSync';
import { useLayoutModals } from '../../hooks/useLayoutModals';

const Layout = () => {
	const { user } = useAuth() as AuthContextType;
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

	return (
		<>
			<SwitchProfileModal
				visible={switchProfileModalVisible}
				onClose={closeSwitchProfileModal}
			/>
			<Tabs>
				<Tabs.Screen
					name='index'
					options={{
						headerTitle: 'Home',
						title: 'Home',
						tabBarIcon: ({ color }) => (
							<FontAwesome
								name='home'
								color={color}
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
							return <Button title='Logout' onPress={logout} />;
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
					name='create-flag/index'
					options={{
						headerTitle: 'Create Flag',
						title: 'Create Flag',
						tabBarIcon: ({ color }) => (
							<Feather
								name='flag'
								size={isPortrait ? 28 : 18}
								color={color}
							/>
						),
						tabBarActiveTintColor: colors.exodusFruit,
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
							<Feather
								name='user'
								size={isPortrait ? 28 : 18}
								color={color}
							/>
						),
						tabBarActiveTintColor: colors.exodusFruit,
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
