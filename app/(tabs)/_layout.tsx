import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
const Layout = () => {
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
				}}
			/>
			<Tabs.Screen
				name='create-flag'
				options={{
					headerTitle: 'Create Flag',
					title: 'Create Flag',
					tabBarIcon: ({ color }) => (
						<FontAwesome name='flag' color={color} size={28} />
					),
				}}
			/>
		</Tabs>
	);
};

export default Layout;
