import { router } from 'expo-router';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useContext, useState } from 'react';
import Toast from 'react-native-toast-message';
import AppButton from '../AppButton';
import AppInput from '../AppInput';
import CloseButton from '../CloseButton';
import { PersonRow, rankPeople } from '../PeopleOverview';
import StoreContext from '../../store';
import useCreateProfile from '../../hooks/useCreateProfile';
import { SwitchProfileModalProps } from '../../models/modalModels';
import { colors, typeScale } from '../../libs/board/constants';

// Lives inside the sheet, so it starts empty each time the sheet opens (a hidden Modal unmounts its children).
const AddPerson = () => {
	const { name, error, handleSubmit, handleNameChange } = useCreateProfile();
	return (
		<>
			<View style={styles.add}>
				<AppInput
					style={styles.addInput}
					value={name}
					onChangeText={handleNameChange}
					placeholder="New person's name"
					accessibilityLabel="New person's name"
					returnKeyType='done'
					onSubmitEditing={handleSubmit}
				/>
				<AppButton title='Add' onPress={handleSubmit} />
			</View>
			{error.name ? <Text style={styles.error}>{error.name}</Text> : null}
		</>
	);
};

// The People tab's sheet: Main, then everyone drawn as on Main's board list. Tap someone to open their board,
// or add a person at the bottom. Deleting a person is in their Edit popup (the pencil on their board).
const SwitchProfileModal = ({ visible, onClose }: SwitchProfileModalProps) => {
	const {
		currentProfileId,
		setCurrentProfileId,
		profiles = [],
		dealbreaker = {},
		ensureProfileExists,
	} = useContext(StoreContext) as any;
	const [showEnded, setShowEnded] = useState(false);
	const people = rankPeople(dealbreaker, profiles);
	const active = people.filter((p) => !p.ended);
	const ended = people.filter((p) => p.ended);

	// The sheet opens from the bottom bar on any screen, so picking someone also shows their board.
	const open = (id: string) => {
		onClose();
		if (id !== currentProfileId) {
			ensureProfileExists(id);
			setCurrentProfileId(id);
		}
		router.navigate('/');
	};
	const row = (p: (typeof people)[number]) => (
		<PersonRow key={p.id} person={p} selected={p.id === currentProfileId} onPress={() => open(p.id)} />
	);

	return (
		<Modal
			visible={visible}
			animationType='slide'
			presentationStyle='pageSheet'
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			onRequestClose={onClose}>
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title} accessibilityRole='header'>
						People
					</Text>
					<CloseButton onPress={onClose} />
				</View>
				<ScrollView
					contentContainerStyle={styles.list}
					keyboardShouldPersistTaps='handled'
					automaticallyAdjustKeyboardInsets>
					<TouchableOpacity
						style={[styles.mainRow, currentProfileId === 'main' && styles.selected]}
						onPress={() => open('main')}
						accessibilityRole='button'
						accessibilityState={{ selected: currentProfileId === 'main' }}>
						<View style={styles.mainText}>
							<Text style={styles.mainName}>Main</Text>
							<Text style={styles.caption}>Your flag list</Text>
						</View>
						{currentProfileId === 'main' ? <Feather name='check' size={20} color={colors.ink} /> : null}
					</TouchableOpacity>
					{active.map(row)}
					{ended.length ? (
						<AppButton
							title={showEnded ? 'Hide ended' : `Show ended (${ended.length})`}
							variant='link'
							onPress={() => setShowEnded(!showEnded)}
						/>
					) : null}
					{showEnded ? ended.map(row) : null}
					<AddPerson />
				</ScrollView>
			</SafeAreaView>
			{/* The app's own toast sits under this sheet, so the sheet shows its own (duplicate name, guest limit). */}
			<Toast />
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.surface },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.hairline,
	},
	title: { ...typeScale.heading, color: colors.ink },
	list: { paddingHorizontal: 16, paddingBottom: 24 },
	// Matches PersonRow's spacing and divider.
	mainRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.hairline,
	},
	// The tint reaches the sheet's edges; the list's own padding is 16.
	selected: { backgroundColor: colors.blush, marginHorizontal: -16, paddingHorizontal: 16 },
	mainText: { flex: 1 },
	mainName: { ...typeScale.emphasis, color: colors.ink },
	caption: { ...typeScale.label, color: colors.muted },
	add: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
	addInput: { flex: 1 },
	error: { ...typeScale.label, color: colors.danger, marginTop: 4 },
});

export default SwitchProfileModal;
