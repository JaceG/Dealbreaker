import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useState } from 'react';
import StoreContext from './store';
import ListsScreen from './Screens/Lists';
import CreateFlagsScreen from './Screens/CreateFlags';
import Toast from 'react-native-toast-message';
import CreateProfileScreen from './Screens/CreateProfiles';

const Drawer = createDrawerNavigator();

export default function App() {
	const [dealbreaker, setDealbreaker] = useState({
		main: {
			flag: [],
			dealbreaker: [],
		},
	});

	const [profile, setProfile] = useState([]);
	const [currentProfile, setCurrentProfile] = useState('main');

	return (
		<StoreContext.Provider
			value={{
				dealbreaker,
				profile,
				setDealbreaker,
				setProfile,
				currentProfile,
				setCurrentProfile,
			}}>
			<NavigationContainer>
				<Drawer.Navigator>
					<Drawer.Screen name='Flags List' component={ListsScreen} />
					<Drawer.Screen
						name='Create Flag'
						component={CreateFlagsScreen}
					/>
					<Drawer.Screen
						name='Create Profile'
						component={CreateProfileScreen}
					/>
				</Drawer.Navigator>
				<Toast />
			</NavigationContainer>
		</StoreContext.Provider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
