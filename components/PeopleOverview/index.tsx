import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import AppButton from '../AppButton';
import { colors } from '../../libs/board/constants';
import { DealbreakerState, Profile } from '../../models/dataModels';

type Props = {
	dealbreaker: DealbreakerState;
	profiles: Profile[];
	onOpenProfile: (profileId: string) => void;
	onCompare: () => void;
};

export const profileCounts = (dealbreaker: DealbreakerState, id: string) => {
	const flags = dealbreaker[id]?.flag || [];
	return {
		red: flags.filter((f) => f.flag === 'red').length,
		yellow: flags.filter((f) => f.flag === 'yellow').length,
		total: flags.length + (dealbreaker[id]?.dealbreaker?.length || 0),
		dealbreakers: dealbreaker[id]?.dealbreaker?.length || 0,
	};
};

// Main's overview: people ranked by how worrying their board is, ended ones folded away.
const PeopleOverview = ({ dealbreaker, profiles, onOpenProfile, onCompare }: Props) => {
	const [expanded, setExpanded] = useState(false);
	const [showEnded, setShowEnded] = useState(false);
	const people = profiles
		.filter((p) => p.id !== 'main' && dealbreaker[p.id])
		.map((p) => ({ ...p, ...profileCounts(dealbreaker, p.id), ended: !!dealbreaker[p.id]?.ended }))
		.sort((a, b) => b.dealbreakers - a.dealbreakers || b.red - a.red || b.yellow - a.yellow);
	const active = people.filter((p) => !p.ended);
	const ended = people.filter((p) => p.ended);

	if (people.length === 0) return null;

	const renderPerson = (p: (typeof people)[number]) => (
		<TouchableOpacity key={p.id} style={styles.row} onPress={() => onOpenProfile(p.id)}>
			<Text style={styles.name} numberOfLines={1}>
				{p.name}
				{p.ended ? <Text style={styles.ended}> (ended)</Text> : null}
			</Text>
			<View style={styles.bar}>
				<View style={{ flex: p.dealbreakers, backgroundColor: colors.chiGong }} />
				<View style={{ flex: p.red, backgroundColor: colors.flagRed }} />
				<View style={{ flex: p.yellow, backgroundColor: colors.flagYellow }} />
				<View style={{ flex: Math.max(p.total - p.red - p.yellow - p.dealbreakers, 0), backgroundColor: colors.flagWhite }} />
			</View>
			<Text style={styles.counts}>
				{p.dealbreakers ? `${p.dealbreakers} DB · ` : ''}
				{p.red} red · {p.yellow} yellow
			</Text>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					accessibilityRole='button'
					accessibilityLabel={`${active.length} dating, ${ended.length} ended. ${expanded ? 'Hide' : 'Show'} people`}
					style={styles.headerToggle}
					onPress={() => setExpanded(!expanded)}>
					<Text style={styles.headerText}>
						{active.length} dating · {ended.length} ended
					</Text>
					<Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.officer} />
				</TouchableOpacity>
				<AppButton title='Compare' onPress={onCompare} />
			</View>
			{expanded ? (
				<View style={styles.list}>
					{active.map(renderPerson)}
					{ended.length ? (
						<TouchableOpacity onPress={() => setShowEnded(!showEnded)}>
							<Text style={styles.footer}>
								{showEnded ? 'Hide ended' : `Show ended (${ended.length})`}
							</Text>
						</TouchableOpacity>
					) : null}
					{showEnded ? ended.map(renderPerson) : null}
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingVertical: 5,
	},
	headerText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	list: {
		marginTop: 5,
		borderTopWidth: 1,
		borderTopColor: '#ccc',
	},
	row: {
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		gap: 5,
	},
	name: {
		fontSize: 16,
	},
	ended: {
		color: colors.bay,
	},
	bar: {
		flexDirection: 'row',
		height: 10,
		borderRadius: 5,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#ccc',
	},
	counts: {
		fontSize: 14,
		color: colors.bay,
	},
	footer: {
		fontSize: 14,
		color: colors.exodusFruit,
		paddingVertical: 10,
	},
});

export default PeopleOverview;
