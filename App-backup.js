import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Board, BoardRepository } from 'react-native-draganddrop-board';

const data = [
	{
		id: 1,
		name: '',
		rows: [
			{
				id: '1',
				name: 'Analyze your audience',
			},
			{
				id: '2',
				name: 'Select a topic',
			},
			{
				id: '3',
				name: 'Define the objective',
			},
		],
	},
	{
		id: 2,
		name: '',
		rows: [
			{
				id: '4',
				name: 'Look at drawings',
			},
			{
				id: '5',
				name: 'Draw from drawings',
			},
			{
				id: '6',
				name: 'Draw from photographs',
			},
		],
	},
];

export default function App() {
	let ScreenHeight = Dimensions.get('window').height - 150;

	var Styles = StyleSheet.create({ container: { height: ScreenHeight } });

	const [list, setList] = useState(() => {
		return new BoardRepository(data);
	});

	return (
		<View style={styles.container}>
			<Text>yytyrty</Text>
			<View>
				<Board
					boardBackground={null}
					boardRepository={list}
					open={() => {}}
					onDragEnd={() => {}}
				/>
			</View>
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
