import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import AppButton from '../AppButton';
import { colors, radius, typeScale } from '../../libs/board/constants';
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

// Everyone but Main with their counts, the most worrying board first.
export const rankPeople = (dealbreaker: DealbreakerState, profiles: Profile[]) =>
	profiles
		.filter((p) => p.id !== 'main')
		.map((p) => ({ ...p, ...profileCounts(dealbreaker, p.id), ended: !!dealbreaker[p.id]?.ended }))
		.sort((a, b) => b.dealbreakers - a.dealbreakers || b.red - a.red || b.yellow - a.yellow);

type Person = ReturnType<typeof rankPeople>[number];

// One person: name, flag bar and counts. The board's list and the People sheet both draw people with it.
export const PersonRow = ({ person: p, onPress, selected = false }: { person: Person; onPress: () => void; selected?: boolean }) => (
	<TouchableOpacity
		style={styles.row}
		onPress={onPress}
		accessibilityRole='button'
		accessibilityState={{ selected }}>
		<View style={styles.nameRow}>
			<Text style={styles.name} numberOfLines={1}>
				{p.name}
				{p.ended ? <Text style={styles.ended}> (ended)</Text> : null}
			</Text>
			{selected ? <Feather name='check' size={20} color={colors.ink} /> : null}
		</View>
		<View style={styles.bar}>
			<View style={{ flex: p.dealbreakers, backgroundColor: colors.dealbreaker }} />
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

// Main's overview: people ranked by how worrying their board is, ended ones folded away.
const PeopleOverview = ({ dealbreaker, profiles, onOpenProfile, onCompare }: Props) => {
	const [expanded, setExpanded] = useState(false);
	const [showEnded, setShowEnded] = useState(false);
	const people = rankPeople(dealbreaker, profiles).filter((p) => dealbreaker[p.id]);
	const active = people.filter((p) => !p.ended);
	const ended = people.filter((p) => p.ended);

	if (people.length === 0) return null;

	const renderPerson = (p: Person) => <PersonRow key={p.id} person={p} onPress={() => onOpenProfile(p.id)} />;

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
					<Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
				</TouchableOpacity>
				<AppButton title='Compare' onPress={onCompare} />
			</View>
			{expanded ? (
				<View style={styles.list}>
					{active.map(renderPerson)}
					{ended.length ? (
						<AppButton
							title={showEnded ? 'Hide ended' : `Show ended (${ended.length})`}
							variant='link'
							onPress={() => setShowEnded(!showEnded)}
						/>
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
		borderColor: colors.hairline,
		borderRadius: radius.card,
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
		...typeScale.emphasis,
	},
	list: {
		marginTop: 5,
		borderTopWidth: 1,
		borderTopColor: colors.hairline,
	},
	row: {
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.hairline,
		gap: 5,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	name: {
		...typeScale.emphasis,
		flex: 1,
	},
	ended: {
		color: colors.muted,
	},
	bar: {
		flexDirection: 'row',
		height: 10,
		borderRadius: radius.pill,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: colors.outline,
	},
	counts: {
		...typeScale.label,
		color: colors.muted,
	},
});

export default PeopleOverview;
