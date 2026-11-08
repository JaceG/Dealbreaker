// Flags over time: one line per person, the running count of flags that showed up (yellow, red, dealbreaker).
// Calendar lines up real dates; Aligned starts everyone at day 0, so you can compare how fast flags pile up.
// Press and hold the chart to read everyone's count at that point.
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { DashPathEffect, Line as SkiaLine, matchFont, vec } from '@shopify/react-native-skia';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import CloseButton from '../CloseButton';
import { Legend } from './index';
import { colors } from '../../libs/board/constants';
import { flagsOverTime } from '../../utils/stats';
import type { TimelinePerson } from './Timeline';

type Mode = 'calendar' | 'aligned';

const DAY = 86400000;
const HEIGHT = 220;
const MAX_TICKS = 5; // fits a 375pt phone
// Dark enough to see on white and apart from each other (Okabe-Ito based); the legend and panel name each line.
const PALETTE = ['#0072B2', '#D55E00', '#009E73', colors.blurple, '#B5367A', '#8C510A'];
const colorOf = (i: number) => PALETTE[i % PALETTE.length];

const longDate = (t: number) =>
	new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dayLabel = (x: number) => `Day ${Math.floor(x) + 1}`;

// Tick positions in days, at most MAX_TICKS, with a label for each.
const xAxisFor = (mode: Mode, from: number, span: number) => {
	if (mode === 'aligned') {
		const step =
			[1, 2, 7, 14, 30, 60, 90, 180, 365].find((s) => span / s < MAX_TICKS) ?? Math.ceil(span / MAX_TICKS / 365) * 365;
		const label = (x: number) =>
			x === 0
				? 'Start'
				: step < 7
					? dayLabel(x)
					: step < 30
						? `${x / 7} wk`
						: step < 365
							? `${Math.round(x / 30)} mo`
							: `${Math.round(x / 365)} yr`;
		return { ticks: Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => i * step), label };
	}
	// Month starts every 1, 2, 3, 6 or 12 months; a range shorter than that gets its first and last day.
	const months = span / 30.44;
	const step = [1, 2, 3, 6, 12].find((m) => months / m < MAX_TICKS) ?? Math.ceil(months / MAX_TICKS / 12) * 12;
	const ticks: number[] = [];
	const d = new Date(from);
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	if (+d < from) d.setMonth(d.getMonth() + 1);
	while (d.getMonth() % Math.min(step, 12)) d.setMonth(d.getMonth() + 1);
	for (; +d <= from + span * DAY; d.setMonth(d.getMonth() + step)) ticks.push((+d - from) / DAY);
	const label = (x: number) => {
		const date = new Date(from + x * DAY);
		if (ticks.length < 2) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		const january = date.getMonth() === 0;
		return date.toLocaleDateString(undefined, january ? { month: 'short', year: '2-digit' } : { month: 'short' });
	};
	return { ticks: ticks.length < 2 ? [0, span] : ticks, label };
};

export const FlagsOverTime = ({ from, people }: { from: number; people: TimelinePerson[] }) => {
	const [mode, setMode] = useState<Mode>('calendar');
	const [index, setIndex] = useState<number | null>(null);
	// Victory keeps the last matched index after the finger lifts, so pressing the same point again would change nothing.
	const clearPress = () => {
		state.matchedIndex.value = -1;
		setIndex(null);
	};
	const { state } = useChartPressState({ x: 0, y: {} as Record<string, number> });
	// System font, so no font file is bundled.
	const font = useMemo(
		() => matchFont({ fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }), fontSize: 12 }),
		[],
	);

	const { rows, span, max } = useMemo(() => flagsOverTime(people, mode), [people, mode]);
	const x = xAxisFor(mode, from, Math.max(1, span));
	const yStep = Math.max(1, Math.ceil(max / 4));
	const yTicks = Array.from({ length: Math.ceil(max / yStep) + 1 }, (_, i) => i * yStep);
	const row = index === null ? undefined : rows[index];

	// The chart's touch handling runs on the UI thread; bring the touched row over to show it in the panel.
	useAnimatedReaction(
		() => state.matchedIndex.value,
		(i, prev) => {
			if (i >= 0 && i !== prev) scheduleOnRN(setIndex, i);
			// Victory resets to -1 when the data changes (a reload); close the panel so it can't show another row.
			else if (i < 0 && prev !== null && prev >= 0) scheduleOnRN(setIndex, null);
		},
	);

	const when = (p: TimelinePerson) =>
		mode === 'aligned' ? `day ${Math.floor((p.end - p.start) / DAY) + 1}` : longDate(p.end);
	const summary = people
		.map((p) => `${p.name}${p.ended ? ', ended' : ''}: ${p.events.length} flags by ${when(p)}`)
		.join('. ');

	return (
		<View>
			<View style={styles.segment} accessibilityRole='tablist'>
				{(['calendar', 'aligned'] as const).map((m) => (
					<Pressable
						key={m}
						accessibilityRole='tab'
						accessibilityState={{ selected: mode === m }}
						style={[styles.segmentButton, mode === m && styles.segmentOn]}
						onPress={() => {
							setMode(m);
							clearPress();
						}}>
						<Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>
							{m === 'calendar' ? 'Calendar' : 'Aligned'}
						</Text>
					</Pressable>
				))}
			</View>

			<Text style={styles.hint}>
				{mode === 'aligned' ? 'Everyone starts at day 0. ' : 'Real dates. '}
				{people.some((p) => p.ended) ? 'Dashed lines have ended. ' : ''}
				Press and hold the chart to read the counts.
			</Text>

			<Legend items={people.map((p, i) => ({ label: p.ended ? `${p.name} (ended)` : p.name, color: colorOf(i) }))} />

			<View style={{ height: HEIGHT }} accessible accessibilityLabel={summary}>
				<CartesianChart
					data={rows}
					xKey='x'
					yKeys={people.map((p) => p.id)}
					domain={{ x: [0, Math.max(1, span)], y: [0, yTicks[yTicks.length - 1]] }}
					padding={{ left: 4, right: 16, top: 8 }}
					chartPressState={state}
					xAxis={{
						font,
						tickValues: x.ticks,
						tickCount: x.ticks.length,
						formatXLabel: x.label,
						labelColor: colors.officer,
					}}
					yAxis={[
						{
							font,
							tickValues: yTicks,
							tickCount: yTicks.length,
							formatYLabel: (v) => String(v),
							labelColor: colors.officer,
						},
					]}>
					{({ points, xScale, chartBounds }) => (
						<>
							{people.map((p, i) => (
								<Line
									key={p.id}
									points={points[p.id]}
									curveType='stepAfter'
									color={colorOf(i)}
									strokeWidth={p.ended ? 2 : 3}
									opacity={p.ended ? 0.7 : 1}>
									{p.ended ? <DashPathEffect intervals={[6, 5]} /> : null}
								</Line>
							))}
							{row ? (
								<SkiaLine
									p1={vec(xScale(row.x), chartBounds.top)}
									p2={vec(xScale(row.x), chartBounds.bottom)}
									color={colors.officer}
									strokeWidth={1}
								/>
							) : null}
						</>
					)}
				</CartesianChart>
			</View>

			{row ? (
				<View style={styles.detail}>
					<View style={styles.detailHeader}>
						<Text style={[styles.detailTitle, { flex: 1 }]}>
							{mode === 'aligned' ? dayLabel(row.x) : longDate(from + row.x * DAY)}
						</Text>
						<CloseButton onPress={clearPress} />
					</View>
					{people.map((p, i) => (
						<View key={p.id} style={styles.detailItem}>
							<View style={[styles.swatch, { backgroundColor: colorOf(i) }]} />
							<Text style={[styles.detailName, p.ended && styles.ended]} numberOfLines={1}>
								{p.name}
							</Text>
							<Text style={styles.detailCount}>
								{row[p.id] !== null
									? `${row[p.id]} flags`
									: mode === 'calendar' && row.x < (p.start - from) / DAY
										? 'not started'
										: 'ended'}
							</Text>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	segment: {
		flexDirection: 'row',
		alignSelf: 'flex-start',
		borderWidth: 2,
		borderColor: colors.blurple,
		borderRadius: 8,
		overflow: 'hidden',
		marginBottom: 8,
	},
	segmentButton: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
	segmentOn: { backgroundColor: colors.blurple },
	segmentText: { fontSize: 16, fontWeight: 'bold', color: colors.blurple },
	segmentTextOn: { color: colors.white },
	hint: { fontSize: 14, color: colors.officer, marginBottom: 8 },
	detail: {
		marginTop: 12,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ccc',
		backgroundColor: colors.fallingStar,
		gap: 6,
	},
	detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	detailTitle: { fontSize: 16, fontWeight: 'bold', color: colors.black },
	detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	swatch: { width: 14, height: 14, borderRadius: 3 },
	detailName: { flex: 1, fontSize: 15, color: colors.black },
	detailCount: { fontSize: 15, fontWeight: 'bold', color: colors.black },
	ended: { color: colors.officer, fontStyle: 'italic' },
});
