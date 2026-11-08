// Small charts drawn with plain views, so they ship as an over-the-air update (no chart library, no native build).
// shortcut: no axes, gridlines or touch tooltips; move to react-native-svg + a chart library with the next native build.
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../libs/board/constants';

export { Timeline } from './Timeline';

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
});
