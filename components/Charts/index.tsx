// Small charts drawn with plain views, so they ship as an over-the-air update (no chart library, no native build).
// shortcut: no axes, gridlines or touch tooltips; move to react-native-svg + a chart library with the next native build.
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../libs/board/constants';

export type Segment = { value: number; color: string };

// Chart colors. Yellow is light, so every bar gets a dark outline to stay visible on white.
export const CHART = {
	changes: colors.blurple,
	notes: colors.bay,
	yellow: colors.flagYellow,
	red: colors.flagRed,
	dealbreaker: colors.deepComaru,
	line: colors.blurple,
	ended: colors.bay,
};

const total = (segments: Segment[]) => segments.reduce((n, s) => n + s.value, 0);

export const Legend = ({ items }: { items: { label: string; color: string }[] }) => (
	<View style={styles.legend} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
		{items.map((i) => (
			<View key={i.label} style={styles.legendItem}>
				<View style={[styles.swatch, { backgroundColor: i.color }]} />
				<Text style={styles.legendText}>{i.label}</Text>
			</View>
		))}
	</View>
);

// Vertical stacked bars, one per column (e.g. a month), with the total above and the label below.
export const StackedColumns = ({
	columns,
	height = 140,
	summary,
}: {
	columns: { label: string; segments: Segment[] }[];
	height?: number;
	summary: string;
}) => {
	const max = Math.max(1, ...columns.map((c) => total(c.segments)));
	return (
		<View accessible accessibilityLabel={summary} style={styles.columns}>
			{columns.map((c, i) => {
				const sum = total(c.segments);
				return (
					<View key={`${c.label}-${i}`} style={styles.column}>
						<Text style={styles.columnTotal} numberOfLines={1} adjustsFontSizeToFit>
							{sum || ''}
						</Text>
						<View style={{ height, justifyContent: 'flex-end', width: '70%' }}>
							{sum > 0 ? (
								<View style={[styles.stack, { height: (sum / max) * height }]}>
									{[...c.segments]
										.reverse()
										.map((s, j) =>
											s.value > 0 ? <View key={j} style={{ flex: s.value, backgroundColor: s.color }} /> : null,
										)}
								</View>
							) : (
								<View style={styles.zero} />
							)}
						</View>
						<Text style={styles.columnLabel} numberOfLines={1}>
							{c.label}
						</Text>
					</View>
				);
			})}
		</View>
	);
};

// Horizontal stacked bars: a label, the bar, and the total.
export const StackedRows = ({
	rows,
	summary,
	labelWidth = 120,
}: {
	rows: { key: string; label: string; segments: Segment[]; muted?: boolean }[];
	summary: string;
	labelWidth?: number;
}) => {
	const max = Math.max(1, ...rows.map((r) => total(r.segments)));
	return (
		<View accessible accessibilityLabel={summary}>
			{rows.map((r) => {
				const sum = total(r.segments);
				return (
					<View key={r.key} style={styles.row}>
						<Text style={[styles.rowLabel, { width: labelWidth }, r.muted && styles.muted]} numberOfLines={2}>
							{r.label}
						</Text>
						<View style={styles.rowTrack}>
							{sum > 0 ? (
								<View style={[styles.rowBar, { width: `${(sum / max) * 100}%` }]}>
									{r.segments.map((s, j) =>
										s.value > 0 ? <View key={j} style={{ flex: s.value, backgroundColor: s.color }} /> : null,
									)}
								</View>
							) : null}
						</View>
						<Text style={styles.rowTotal}>{sum}</Text>
					</View>
				);
			})}
		</View>
	);
};

const monthStart = (t: number) => {
	const d = new Date(t);
	return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

// One line per person across the same date range; dots where a card turned red, squares where one became a dealbreaker.
export const Timeline = ({
	from,
	to,
	people,
	summary,
}: {
	from: number;
	to: number;
	people: {
		id: string;
		name: string;
		ended: boolean;
		start: number;
		end: number;
		events: { t: number; dealbreaker: boolean }[];
	}[];
	summary: string;
}) => {
	const span = Math.max(1, to - from);
	const pos = (t: number) => `${Math.min(100, Math.max(0, ((t - from) / span) * 100))}%` as const;
	// Month marks along the bottom: first, middle and last.
	const label = (t: number) =>
		new Date(t).toLocaleDateString(undefined, {
			month: 'short',
			year: '2-digit',
		});
	// First, middle and last month, without repeats when the range is short.
	const ticks = [from, from + span / 2, to]
		.map((t) => label(monthStart(t)))
		.map((l, i, all) => (all.indexOf(l) === i ? l : ''));
	return (
		<View accessible accessibilityLabel={summary}>
			{people.map((p) => (
				<View key={p.id} style={styles.tlRow}>
					<Text style={[styles.tlName, p.ended && styles.muted]} numberOfLines={1}>
						{p.name}
					</Text>
					<View style={styles.tlTrack}>
						<View
							style={[
								styles.tlLine,
								{
									left: pos(p.start),
									right: `${100 - parseFloat(pos(p.end))}%`,
									backgroundColor: p.ended ? CHART.ended : CHART.line,
								},
							]}
						/>
						{p.ended ? <View style={[styles.tlEnd, { left: pos(p.end) }]} /> : null}
						{p.events.map((e, i) => (
							<View
								key={i}
								style={[
									styles.tlDot,
									{ left: pos(e.t) },
									e.dealbreaker
										? { backgroundColor: CHART.dealbreaker, borderRadius: 2 }
										: { backgroundColor: CHART.red, borderRadius: 6 },
								]}
							/>
						))}
					</View>
				</View>
			))}
			<View style={styles.tlTicks}>
				<View style={styles.tlNameSpacer} />
				<View style={styles.tlTickRow}>
					{ticks.map((t, i) => (
						<Text
							key={i}
							style={[styles.tlTick, i === 1 && { textAlign: 'center' }, i === 2 && { textAlign: 'right' }]}>
							{t}
						</Text>
					))}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
	swatch: {
		width: 14,
		height: 14,
		borderRadius: 3,
		borderWidth: 1,
		borderColor: colors.officer,
	},
	legendText: { fontSize: 14, color: colors.officer },
	columns: { flexDirection: 'row', alignItems: 'flex-end' },
	column: { flex: 1, alignItems: 'center' },
	columnTotal: { fontSize: 12, color: colors.officer, height: 16 },
	stack: {
		width: '100%',
		borderWidth: 1,
		borderColor: colors.officer,
		borderRadius: 3,
		overflow: 'hidden',
	},
	zero: { height: 1, backgroundColor: '#ccc' },
	columnLabel: { fontSize: 12, color: colors.officer, marginTop: 4 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 5,
	},
	rowLabel: { fontSize: 14, color: colors.black },
	rowTrack: { flex: 1, height: 18, overflow: 'hidden' },
	rowBar: {
		height: '100%',
		flexDirection: 'row',
		borderWidth: 1,
		borderColor: colors.officer,
		borderRadius: 3,
		overflow: 'hidden',
	},
	rowTotal: {
		minWidth: 24,
		fontSize: 14,
		fontWeight: 'bold',
		textAlign: 'right',
	},
	muted: { color: colors.officer, fontStyle: 'italic' },
	tlRow: { flexDirection: 'row', alignItems: 'center', height: 30 },
	tlName: { width: 70, fontSize: 14 },
	tlTrack: { flex: 1, height: 30, justifyContent: 'center' },
	tlLine: { position: 'absolute', height: 4, borderRadius: 2 },
	tlEnd: {
		position: 'absolute',
		width: 2,
		height: 16,
		marginLeft: -1,
		backgroundColor: CHART.ended,
	},
	tlDot: {
		position: 'absolute',
		width: 12,
		height: 12,
		marginLeft: -6,
		borderWidth: 1,
		borderColor: colors.white,
	},
	tlTicks: { flexDirection: 'row', marginTop: 4 },
	tlNameSpacer: { width: 70 },
	tlTickRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
	tlTick: { flex: 1, fontSize: 12, color: colors.officer },
});
