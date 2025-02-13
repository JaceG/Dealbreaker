import { StyleSheet, Text, View, TextInput, Button } from 'react-native';
import RadioGroup from 'react-native-radio-buttons-group';
import { color } from 'react-native-reanimated';
import { useMemo, useState, useContext } from 'react';
import { showToast } from '../../utils/functions';
import { set } from 'react-native-reanimated';
import StoreContext from '../../store';

export default function CreateFlags({ navigation }) {
	const { dealbreaker, setDealbreaker } = useContext(StoreContext);
	const radioButtons = useMemo(
		() => [
			{
				id: '1',
				label: 'Flag',
				value: 'flag',
				color: '#fff',
				labelStyle: { color: '#fff', fontSize: 20 },
			},
			{
				id: '2',
				label: 'Dealbreaker',
				value: 'dealbreaker',
				color: '#fff',
				labelStyle: { color: '#fff', fontSize: 20 },
			},
		],
		[]
	);

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState({
		title: '',
		description: '',
	});
	function handleSubmit() {
		if (validate()) {
			const type = selectedId === '1' ? 'flag' : 'dealbreaker';
			setDealbreaker({
				...dealbreaker,
				main: {
					...dealbreaker.main,
					[type]: [...dealbreaker.main[type], { title, description }],
				},
			});
			showToast('success', 'Flag created successfully');
			setTitle('');
			setDescription('');
			setSelectedId('1');
			navigation.navigate('Flags List');
		} else showToast('error', 'Fix the following errors');
	}

	const [selectedId, setSelectedId] = useState('1');
	function handleTitleChange(text) {
		setTitle(text);
		handleValidation('title', text);
	}
	function handleDescriptionChange(text) {
		setDescription(text);
		handleValidation('description', text);
	}
	function handleValidation(
		type,
		text = '',
		isShow = true,
		initialError = null
	) {
		let newError = {
			title: initialError ? initialError.title : error.title,
			description: initialError
				? initialError.description
				: error.description,
		};
		newError[type] = '';
		if (!text && type === 'title') {
			newError[type] = `${type} is required`;
		}
		if (text && type === 'title' && text.length > 100) {
			newError[type] = `${type} too long`;
		}
		if (text && type === 'description' && text.length > 1000) {
			newError[type] = `${type} too long`;
		}
		if (isShow) setError(newError);

		return newError;
	}

	function validate() {
		let newError = handleValidation('title', title, false, error);
		newError = handleValidation(
			'description',
			description,
			false,
			newError
		);
		setError(newError);
		const errorList = Object.values(newError);
		return !errorList.find((item) => item);
	}

	return (
		<View style={styles.container}>
			<View style={styles.row}>
				<Text style={styles.text}>Flag Name:</Text>
				<TextInput
					onChangeText={handleTitleChange}
					style={styles.textInput}
					placeholder='Enter Name'
					placeholderTextColor={'white'}
				/>
				{error.title ? (
					<Text style={styles.errorText}>{error.title}</Text>
				) : null}
			</View>
			<View style={styles.row}>
				<Text style={styles.text}>Description:</Text>
				<TextInput
					onChangeText={handleDescriptionChange}
					style={{ ...styles.textInput, ...styles.description }}
					multiline={true}
					placeholder='Enter Description'
					placeholderTextColor={'white'}
				/>
				{error.description ? (
					<Text style={styles.errorText}>{error.description}</Text>
				) : null}
			</View>
			<View>
				<RadioGroup
					containerStyle={styles.radioButtonStyle}
					radioButtons={radioButtons}
					onPress={setSelectedId}
					selectedId={selectedId}
				/>
			</View>
			<View style={{ width: '100%', marginTop: 20 }}>
				<Button color={'white'} title='Create' onPress={handleSubmit} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#eb4d4b',
		padding: 10,
	},
	row: {
		flexDirection: 'column',
		width: '100%',
		justifyContent: 'center',
		alignItems: 'flex-start',
		marginBottom: 10,
	},
	textInput: {
		padding: 13,
		borderWidth: 1,
		borderColor: '#fff',
		borderRadius: 5,
		width: '100%',
	},
	text: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: 'bold',
		color: '#fff',
	},
	description: {
		height: 120,
		textAlignVertical: 'top',
		color: '#fff',
	},
	radioButtonStyle: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	errorText: {
		color: '#fff',
		fontSize: 16,
		marginTop: 3,
		marginBottom: 3,
	},
});
