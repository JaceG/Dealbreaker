import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import ListsScreen from './Screens/Lists';
import CreateFlagsScreen from './Screens/CreateFlags';
import Toast from 'react-native-toast-message';

const Drawer = createDrawerNavigator();

export default function App() {
	return (
		<NavigationContainer>
			<Drawer.Navigator>
				<Drawer.Screen name='Flags List' component={ListsScreen} />
				<Drawer.Screen
					name='Create Flag'
					component={CreateFlagsScreen}
				/>
			</Drawer.Navigator>
			<Toast />
		</NavigationContainer>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
