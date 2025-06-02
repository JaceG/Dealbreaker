import { View, Text } from 'react-native';
import { Link } from 'expo-router';

const Home = () => {
	return (
		<View>
			<Text>Home</Text>
			<Link href='(tabs)'>Go to Users</Link>
		</View>
	);
};

export default Home;
