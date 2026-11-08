import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FlagDot from '../FlagDot';
import { colors } from '../../libs/board/constants';
import { FlagItem, ProfileData } from '../../models/dataModels';

type Props = {
	profileId: string;
	profile: ProfileData;
	mainDealbreakerIds: Set<string>;
	colorFilter: string | null;
	onFilterChange: (color: string | null) => void;
	onOpenCard: (item: FlagItem) => void;
};

// profile_<ms> ids carry the day the profile was made
const startedOn = (profileId: string) => {
	const ms = Number(profileId.replace('profile_', ''));
	return Number.isFinite(ms) && ms > 0
		? new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
		: null;
};

const explainMainDealbreaker = (title: string) =>
	Alert.alert(
		'Dealbreaker on Main',
		`"${title}" is a dealbreaker on your main profile. Turning it red here moves it to this person's Dealbreakers column.`
	);

// Collapsible counts above a person's board; tapping a count shows only that color.
const ProfileOverview = ({
	profileId,
	profile,
	mainDealbreakerIds,
	colorFilter,
	onFilterChange,
	onOpenCard,
}: Props) => {
	const [expanded, setExpanded] = useState(false);
	const flags = profile.flag || [];
	const count = (color: string) => flags.filter((f) => (f.flag || 'white') === color).length;
	const dealbreakers = profile.dealbreaker || [];

	const listed = flags.filter((f) =>
		colorFilter ? (f.flag || 'white') === colorFilter : f.flag === 'red' || f.flag === 'yellow'
	);
	const since = startedOn(profileId);

	return (
		<View style={styles.container}>
			<View style={styles.countRow}>
				{['red', 'yellow', 'white'].map((color) => (
					<TouchableOpacity
						key={color}
						accessibilityRole='button'
						accessibilityLabel={`${count(color)} ${color} flags. Show only these`}
						accessibilityState={{ selected: colorFilter === color }}
						style={[styles.countChip, colorFilter === color && styles.countChipActive]}
						onPress={() => onFilterChange(colorFilter === color ? null : color)}>
						<FlagDot color={color} />
						<Text style={styles.countText}>{count(color)}</Text>
					</TouchableOpacity>
				))}
				<Text style={styles.dealbreakerCount}>
					· {dealbreakers.length} {dealbreakers.length === 1 ? 'dealbreaker' : 'dealbreakers'}
				</Text>
				<TouchableOpacity
					accessibilityRole='button'
					accessibilityLabel={expanded ? 'Hide flag list' : 'Show flag list'}
					style={styles.chevron}
					onPress={() => setExpanded(!expanded)}>
					<Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.officer} />
				</TouchableOpacity>
			</View>

			{colorFilter ? (
				<TouchableOpacity onPress={() => onFilterChange(null)}>
					<Text style={styles.filterNote}>Showing {colorFilter} flags only · Clear</Text>
				</TouchableOpacity>
			) : null}

			{expanded ? (
				<View style={styles.list}>
					{listed.map((item) => (
						<TouchableOpacity key={item.id} style={styles.row} onPress={() => onOpenCard(item)}>
							<FlagDot color={item.flag || 'white'} size={12} />
							<Text style={styles.rowTitle} numberOfLines={1}>
								{item.title}
							</Text>
							{mainDealbreakerIds.has(item.id) ? (
								<TouchableOpacity
									accessibilityRole='button'
									accessibilityLabel='Why this is marked'
									hitSlop={10}
									onPress={() => explainMainDealbreaker(item.title || '')}>
									<Feather name='alert-circle' size={18} color={colors.chiGong} />
								</TouchableOpacity>
							) : null}
						</TouchableOpacity>
					))}
					{listed.length === 0 ? <Text style={styles.footer}>No flags of this color yet.</Text> : null}
					{since ? <Text style={styles.footer}>Profile started {since}</Text> : null}
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginHorizontal: 10,
		marginTop: 5,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 10,
	},
	countRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	countChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 5,
		paddingVertical: 5,
		borderRadius: 5,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	countChipActive: {
		borderColor: colors.exodusFruit,
	},
	countText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	dealbreakerCount: {
		fontSize: 14,
		color: colors.bay,
		flex: 1,
	},
	chevron: {
		padding: 5,
	},
	filterNote: {
		fontSize: 14,
		color: colors.exodusFruit,
		paddingVertical: 5,
	},
	list: {
		marginTop: 5,
		borderTopWidth: 1,
		borderTopColor: '#ccc',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	rowTitle: {
		flex: 1,
		fontSize: 16,
	},
	footer: {
		fontSize: 14,
		color: colors.bay,
		paddingVertical: 5,
	},
});

export default ProfileOverview;
