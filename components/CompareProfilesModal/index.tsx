import { useContext, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import AppButton from '../AppButton';
import FlagDot from '../FlagDot';
import { profileCounts } from '../PeopleOverview';
import StoreContext from '../../store';
import { showToast } from '../../utils/functions';
import { colors } from '../../libs/board/constants';
import { DealbreakerState, FlagItem, Profile } from '../../models/dataModels';

const COLUMN = 64;
// Five 64-wide columns fit a phone; more would run off the screen.
const MAX_PEOPLE = 5;

// Where a card stands for one person: its flag color, or in their Dealbreakers column.
const standing = (dealbreaker: DealbreakerState, profileId: string, cardId: string) => {
	if (dealbreaker[profileId]?.dealbreaker?.some((c) => c.id === cardId)) return { color: 'red', isDealbreaker: true };
	const card = dealbreaker[profileId]?.flag?.find((c) => c.id === cardId);
	return { color: card?.flag || 'white', isDealbreaker: false };
};

// Every card on its own line with one dot per person under it, so more people fit side by side.
// focusId: opened from a person's board, that person is always one of the columns, first.
const CompareProfilesModal = ({
	visible,
	onClose,
	focusId,
}: {
	visible: boolean;
	onClose: () => void;
	focusId?: string;
}) => {
	const { dealbreaker, profiles } = useContext(StoreContext) as unknown as {
		dealbreaker: DealbreakerState;
		profiles: Profile[];
	};
	const people = profiles.filter((p) => p.id !== 'main' && dealbreaker[p.id]);
	const [selected, setSelected] = useState<string[]>([]);
	const [showAll, setShowAll] = useState(false);

	useEffect(() => {
		if (!visible) return;
		// Start with the five active people most in need of a look, ranked like Main's list.
		const rank = (id: string) => {
			const c = profileCounts(dealbreaker, id);
			return [c.dealbreakers, c.red, c.yellow];
		};
		const byRank = people
			.filter((p) => !dealbreaker[p.id]?.ended && p.id !== focusId)
			.sort((a, b) => {
				const [x, y] = [rank(a.id), rank(b.id)];
				return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
			})
			.map((p) => p.id);
		const first = focusId && dealbreaker[focusId] ? [focusId] : [];
		setSelected([...first, ...byRank].slice(0, MAX_PEOPLE));
	}, [visible, focusId]);

	const shown = people
		.filter((p) => selected.includes(p.id))
		.sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
	const cards: FlagItem[] = [...(dealbreaker.main?.flag || []), ...(dealbreaker.main?.dealbreaker || [])];
	const rows = cards.filter(
		(card) =>
			showAll ||
			shown.some((p) => {
				const s = standing(dealbreaker, p.id, card.id);
				return s.isDealbreaker || s.color !== 'white';
			})
	);
	const toggle = (id: string) => {
		if (selected.includes(id)) return setSelected(selected.filter((s) => s !== id));
		if (selected.length >= MAX_PEOPLE) return showToast('info', `Compare up to ${MAX_PEOPLE} people at a time`);
		setSelected([...selected, id]);
	};

	return (
		<Modal visible={visible} animationType='slide' onRequestClose={onClose}>
			<View style={styles.container}>
				<Text style={styles.title}>Compare People</Text>
				<View style={styles.chips}>
					{people.map((p) => (
						<TouchableOpacity
							key={p.id}
							accessibilityRole='button'
							accessibilityState={{ selected: selected.includes(p.id) }}
							style={[styles.chip, selected.includes(p.id) && styles.chipOn]}
							onPress={() => toggle(p.id)}>
							<Text style={[styles.chipText, selected.includes(p.id) && styles.chipTextOn]}>{p.name}</Text>
						</TouchableOpacity>
					))}
				</View>
				<View style={styles.legend}>
					<FlagDot color='red' size={12} />
					<Text style={styles.legendText}>red</Text>
					<FlagDot color='yellow' size={12} />
					<Text style={styles.legendText}>yellow</Text>
					<FlagDot color='white' size={12} />
					<Text style={styles.legendText}>white</Text>
					<FlagDot color='red' isDealbreaker size={12} />
					<Text style={styles.legendText}>dealbreaker</Text>
				</View>
				<View style={styles.namesRow}>
					{shown.map((p) => (
						<Text key={p.id} style={styles.name} numberOfLines={1}>
							{p.name}
						</Text>
					))}
				</View>
				<ScrollView style={styles.list}>
					{rows.map((card) => (
						<View key={card.id} style={styles.row}>
							<Text style={styles.cardTitle}>{card.title}</Text>
							<View style={styles.dots}>
								{shown.map((p) => {
									const s = standing(dealbreaker, p.id, card.id);
									return (
										<View key={p.id} style={styles.dotCell}>
											<FlagDot color={s.color} isDealbreaker={s.isDealbreaker} />
										</View>
									);
								})}
							</View>
						</View>
					))}
					{rows.length === 0 ? <Text style={styles.empty}>No flags yet for these people.</Text> : null}
				</ScrollView>
				<TouchableOpacity onPress={() => setShowAll(!showAll)}>
					<Text style={styles.showAll}>
						{showAll ? 'Show flagged cards only' : `Show all ${cards.length} cards`}
					</Text>
				</TouchableOpacity>
				<AppButton title='Close' onPress={onClose} variant='secondary' />
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 60,
		paddingHorizontal: 20,
		paddingBottom: 30,
		backgroundColor: colors.white,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 10,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 5,
	},
	chip: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 15,
		borderWidth: 1,
		borderColor: colors.exodusFruit,
	},
	chipOn: {
		backgroundColor: colors.exodusFruit,
	},
	chipText: {
		fontSize: 14,
		color: colors.exodusFruit,
	},
	chipTextOn: {
		color: colors.white,
	},
	legend: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		marginTop: 10,
	},
	legendText: {
		fontSize: 14,
		color: colors.bay,
		marginRight: 5,
	},
	namesRow: {
		flexDirection: 'row',
		marginTop: 10,
		paddingBottom: 5,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
	},
	name: {
		width: COLUMN,
		fontSize: 14,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	list: {
		flex: 1,
	},
	row: {
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	cardTitle: {
		fontSize: 16,
		marginBottom: 5,
	},
	dots: {
		flexDirection: 'row',
	},
	dotCell: {
		width: COLUMN,
		alignItems: 'center',
	},
	empty: {
		fontSize: 14,
		color: colors.bay,
		paddingVertical: 10,
	},
	showAll: {
		fontSize: 14,
		color: colors.exodusFruit,
		textAlign: 'center',
		paddingVertical: 10,
	},
});

export default CompareProfilesModal;
