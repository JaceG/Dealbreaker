import { StyleSheet, Text, View } from 'react-native';

export default function Lists() {
	return (
		<View style={styles.container}>
			<Text>List</Text>
			<View></View>
		</View>
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
