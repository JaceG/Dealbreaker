import { StatusBar } from 'expo-status-bar';
import { useState, useContext, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Button } from 'react-native';
import { Board, BoardRepository } from '../../libs/board/components';
import StoreContext from '../../store';
import AppButton from '../../components/AppButton';
import SwitchProfileModal from '../../components/SwitchProfileModal';

const data = [
	{
		id: 1,
		name: 'Flags',
		rows: [],
	},
	{
		id: 2,
		name: 'Dealbreakers',
		rows: [],
	},
];

export default function Lists({ navigation }) {
	let ScreenHeight = Dimensions.get('window').height - 150;
	const { dealbreaker, currentProfile } = useContext(StoreContext);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		if (
			dealbreaker &&
			(dealbreaker[currentProfile].dealbreaker?.length ||
				dealbreaker[currentProfile].flag?.length)
		) {
			setList(null);
			setTimeout(() => {
				updateBoard();
			}, 100);
		}
	}, [dealbreaker]);

	const updateBoard = () => {
		const { flag, dealbreaker: dealbreakerList } =
			dealbreaker[currentProfile];
		const newData = JSON.parse(JSON.stringify(data));
		newData[0].rows =
			flag.map((data, index) => {
				return {
					id: index,
					name: data.title,
					description: data.description,
				};
			}) || [];
		newData[1].rows =
			dealbreakerList.map((data, index) => {
				return {
					id: index,
					name: data.title,
					description: data.description,
				};
			}) || [];
		setList(new BoardRepository(newData));
	};

	var Styles = StyleSheet.create({ container: { height: ScreenHeight } });

	const [list, setList] = useState(null);

	return (
		<View style={styles.container}>
			<SwitchProfileModal
				visible={visible}
				onClose={() => setVisible(false)}
			/>
			<View>
				{list ? (
					<View>
						<View style={styles.profileButtonContainer}>
							<AppButton
								title={`Switch Profile (${currentProfile})`}
								onPress={() => {
									setVisible(true);
								}}
							/>
						</View>
						<Board
							boardRepository={list}
							open={() => {}}
							onDragEnd={() => {}}
						/>
					</View>
				) : (
					<View style={styles.noDealbreakerContainer}>
						<View style={styles.noDealbreakerInContainer}>
							<Text style={styles.noDealbreakerText}>
								No Flags Yet
							</Text>
							<AppButton
								title='Create Flag'
								onPress={() => {
									navigation.navigate('Create Flag');
								}}
							/>
						</View>
					</View>
				)}
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
	noDealbreakerContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	noDealbreakerInContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
	noDealbreakerText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	profileButtonContainer: {
		marginTop: 50,
		width: '150',
		alignSelf: 'center',
	},
});
