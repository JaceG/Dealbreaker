import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppButton from '../../../components/AppButton';
import FlagDot from '../../../components/FlagDot';
import StoreContext from '../../../store';
import { colors } from '../../../libs/board/constants';
import { getMyHistory } from '../../../utils/api';
import { Board, HistoryRow, isNote, overallStats, personStats, typeChanged } from '../../../utils/stats';

const describe = (h: HistoryRow) => {
	if (typeChanged(h)) {
		return h.newCardType === 'dealbreaker' ? 'moved to Dealbreakers' : 'moved back to Flags';
	}
	if (isNote(h)) return 'note added';
	return `${h.previousStatus || 'white'} → ${h.newStatus || 'white'}`;
};
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<View style={styles.section}>
		<Text style={styles.sectionTitle} accessibilityRole='header'>
			{title}
		</Text>
		{children}
	</View>
);

const Line = ({ label, value }: { label: string; value: string | number }) => (
	<View style={styles.line}>
		<Text style={styles.lineLabel}>{label}</Text>
		<Text style={styles.lineValue}>{value}</Text>
	</View>
);

// Overall numbers from Main's point of view, or one person's, picked with the chips at the top.
const Stats = () => {
	const { dealbreaker, profiles, currentProfileId } = useContext<any>(StoreContext);
	const board = dealbreaker as Board;
	const [history, setHistory] = useState<HistoryRow[] | null>(null);
	const [error, setError] = useState(false);
	const [selected, setSelected] = useState<string>('main');

	const load = useCallback(async () => {
		setError(false);
		try {
			setHistory(await getMyHistory());
		} catch {
			setError(true);
		}
	}, []);

	// Fresh numbers each time the tab opens, starting on the person whose board was open.
	useFocusEffect(
		useCallback(() => {
			setSelected(currentProfileId || 'main');
			load();
		}, [currentProfileId, load])
	);
	useEffect(() => {
		if (selected !== 'main' && !board[selected]) setSelected('main');
	}, [board, selected]);

	const people = profiles
		.filter((p: any) => p.id !== 'main' && board[p.id])
		.sort((a: any, b: any) => Number(!!board[a.id]?.ended) - Number(!!board[b.id]?.ended));
	// The people list has every name; the board blob only has names saved since names moved into it.
	const names: Record<string, string> = Object.fromEntries(people.map((p: any) => [p.id, p.name]));

	return (
		<View style={styles.screen}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
				{[{ id: 'main', name: 'Overall' }, ...people].map((p: any) => (
					<TouchableOpacity
						key={p.id}
						accessibilityRole='tab'
						accessibilityState={{ selected: selected === p.id }}
						style={[styles.chip, selected === p.id && styles.chipOn]}
						onPress={() => setSelected(p.id)}>
						<Text style={[styles.chipText, selected === p.id && styles.chipTextOn]}>
							{p.name}
							{board[p.id]?.ended ? ' (ended)' : ''}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

			{error ? (
				<View style={styles.center}>
					<Text style={styles.muted}>Couldn't load your history.</Text>
					<AppButton title='Try Again' onPress={load} variant='secondary' />
				</View>
			) : !history ? (
				<View style={styles.center}>
					<ActivityIndicator size='large' color={colors.blurple} />
					<Text style={styles.muted}>Loading (the server can take up to a minute to wake)</Text>
				</View>
			) : (
				<ScrollView contentContainerStyle={styles.body}>
					{selected === 'main' ? (
						<Overall board={board} history={history} names={names} />
					) : (
						<Person board={board} history={history} id={selected} name={names[selected]} />
					)}
				</ScrollView>
			)}
		</View>
	);
};

const Overall = ({ board, history, names }: { board: Board; history: HistoryRow[]; names: Record<string, string> }) => {
	const s = overallStats(board, history, names);
	const share = s.changes ? Math.round((s.stepDowns / s.changes) * 100) : 0;
	return (
		<>
			<Section title='At a Glance'>
				<Line label='People' value={`${s.people} (${s.ended} ended)`} />
				<Line label='Color and column changes' value={s.changes} />
				<Line label='Notes added' value={s.notes} />
				<Line label='Flags taken back down' value={s.changes ? `${s.stepDowns} (${share}%)` : '–'} />
				<Line
					label='Yellow to red, usually'
					value={s.yellowToRedDays === null ? 'Not yet' : `${Math.round(s.yellowToRedDays)} days (${s.yellowToRedCount} cards)`}
				/>
			</Section>

			<Section title='Cards That Come Up Most'>
				<Text style={styles.hint}>How many people each card ever reached yellow, red or a dealbreaker with.</Text>
				{s.perCard.length === 0 ? <Text style={styles.muted}>No flags raised yet.</Text> : null}
				{s.perCard.slice(0, 15).map((c) => (
					<View key={c.id} style={styles.cardRow}>
						<Text style={styles.cardTitle} numberOfLines={2}>
							{c.title}
						</Text>
						<View style={styles.counts}>
							{c.yellow ? <Count color='yellow' n={c.yellow} /> : null}
							{c.red ? <Count color='red' n={c.red} /> : null}
							{c.dealbreaker ? <Count color='red' dealbreaker n={c.dealbreaker} /> : null}
						</View>
					</View>
				))}
			</Section>

			<Section title='Maybe Your Pattern'>
				<Text style={styles.hint}>
					Cards you flagged on at least 3 in 4 people. Worth asking whether they're about them or about you.
				</Text>
				{s.yourPatterns.length === 0 ? (
					<Text style={styles.muted}>{s.people < 3 ? 'Shows once you have 3 or more people.' : 'Nothing stands out.'}</Text>
				) : (
					s.yourPatterns.map((c) => <Line key={c.id} label={c.title} value={`${c.reached} of ${s.people}`} />)
				)}
			</Section>

			<Section title='When It Ended'>
				<Text style={styles.hint}>Red flags and dealbreakers on each ended person.</Text>
				{s.endings.length === 0 ? <Text style={styles.muted}>No ended profiles.</Text> : null}
				{s.endings.map((e) => (
					<View key={e.id} style={styles.ending}>
						<Text style={styles.endingName}>{e.name}</Text>
						{e.cards.length === 0 ? <Text style={styles.muted}>No red flags or dealbreakers.</Text> : null}
						{e.cards.map((c, i) => (
							<View key={i} style={styles.endingCard}>
								<FlagDot color='red' isDealbreaker={c.dealbreaker} size={12} />
								<Text style={styles.lineLabel}>{c.title}</Text>
							</View>
						))}
					</View>
				))}
			</Section>
		</>
	);
};

const Person = ({ board, history, id, name }: { board: Board; history: HistoryRow[]; id: string; name?: string }) => {
	const p = personStats(board, history, id, Date.now(), name);
	return (
		<>
			<Section title={p.ended ? `${p.name} (ended)` : p.name}>
				<Line label='Profile age' value={p.days === null ? '–' : `${p.days} days`} />
				<View style={styles.line}>
					<Text style={styles.lineLabel}>Now</Text>
					<View style={styles.counts}>
						<Count color='yellow' n={p.yellow} />
						<Count color='red' n={p.red} />
						<Count color='red' dealbreaker n={p.dealbreakers} />
					</View>
				</View>
				<Line label='History entries' value={`${p.entries} (${p.notes} notes)`} />
				<Line label='Flags taken back down' value={p.stepDowns} />
			</Section>

			<Section title='By Month'>
				{p.months.length === 0 ? <Text style={styles.muted}>No history yet.</Text> : null}
				{p.months.map((m) => (
					<Line key={m.key} label={m.month} value={`${m.changes} changes · ${m.notes} notes`} />
				))}
			</Section>

			<Section title='Latest Changes'>
				{p.latest.length === 0 ? <Text style={styles.muted}>Nothing yet.</Text> : null}
				{p.latest.map((h, i) => (
					<View key={i} style={styles.latest}>
						<Text style={styles.latestDate}>{day(h.timestamp)}</Text>
						<Text style={styles.lineLabel} numberOfLines={2}>
							{h.flagTitle}: {describe(h)}
						</Text>
					</View>
				))}
			</Section>
		</>
	);
};

const Count = ({ color, n, dealbreaker = false }: { color: string; n: number; dealbreaker?: boolean }) => (
	<View
		style={styles.count}
		accessible
		accessibilityLabel={`${n} ${dealbreaker ? 'dealbreaker' : color}`}>
		<FlagDot color={color} isDealbreaker={dealbreaker} size={12} />
		<Text style={styles.countText}>{n}</Text>
	</View>
);

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.white },
	chipBar: { flexGrow: 0 },
	chips: { gap: 8, paddingHorizontal: 10, paddingVertical: 10 },
	chip: {
		minHeight: 44,
		justifyContent: 'center',
		paddingHorizontal: 14,
		borderRadius: 22,
		borderWidth: 2,
		borderColor: colors.blurple,
	},
	chipOn: { backgroundColor: colors.blurple },
	chipText: { fontSize: 16, color: colors.blurple, fontWeight: 'bold' },
	chipTextOn: { color: colors.white },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15, padding: 20 },
	body: { padding: 15, paddingBottom: 40 },
	section: { marginBottom: 25 },
	sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.officer, marginBottom: 8 },
	hint: { fontSize: 14, color: colors.officer, marginBottom: 8 },
	muted: { fontSize: 14, color: colors.officer, textAlign: 'center' },
	line: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	lineLabel: { fontSize: 16, color: colors.black, flexShrink: 1 },
	lineValue: { fontSize: 16, fontWeight: 'bold', color: colors.black },
	cardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	cardTitle: { flex: 1, fontSize: 16 },
	counts: { flexDirection: 'row', gap: 10 },
	count: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	countText: { fontSize: 16, fontWeight: 'bold' },
	ending: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 4 },
	endingName: { fontSize: 16, fontWeight: 'bold' },
	endingCard: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	latest: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
	latestDate: { width: 56, fontSize: 14, color: colors.officer },
});

export default Stats;
