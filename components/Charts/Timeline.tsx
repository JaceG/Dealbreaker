// Relationship timeline: one line per person with a dot each time a flag showed up.
// Calendar lines up real dates; Aligned starts everyone at day 0, so you can compare when in a relationship flags appear.
// Pinch the chart or use the buttons to zoom (the chart scrolls sideways); from 2x the dots can be tapped.
import { type ComponentRef, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePinchGesture } from 'react-native-gesture-handler';
import Feather from '@expo/vector-icons/Feather';
import CloseButton from '../CloseButton';
import { colors } from '../../libs/board/constants';
import type { TimelineEvent } from '../../utils/stats';

export type TimelinePerson = {
	id: string;
	name: string;
	ended: boolean;
	start: number;
	end: number;
	events: TimelineEvent[];
};

type Mode = 'calendar' | 'aligned';

const DAY = 86400000;
const ZOOMS = [1, 2, 4, 8]; // the buttons step between these; a pinch can stop anywhere from the first to the last
const TAP_ZOOM = 2; // dots are too close together to tap below this
const ROW = 44; // also the dot's tap target
const NAME_WIDTH = 70;
const PAD = 10; // keeps the first and last dot inside the track
const TICK_SPACING = 60;
// The first label is pulled inward by up to half its width minus PAD, so steps need that much extra room.
const MIN_STEP_PX = TICK_SPACING + TICK_SPACING / 2 - PAD;

const KIND = {
	yellow: { color: colors.flagYellow, label: 'Turned yellow', radius: 6 },
	red: { color: colors.flagRed, label: 'Turned red', radius: 6 },
	dealbreaker: { color: colors.deepComaru, label: 'Became a dealbreaker', radius: 2 },
};

const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (t: number) =>
	new Date(t).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
const dayOf = (p: TimelinePerson, t: number) => Math.floor((t - p.start) / DAY) + 1;
const SEVERITY = { yellow: 0, red: 1, dealbreaker: 2 };
const keyOf = (e: TimelineEvent) => `${e.flagId}|${e.t}|${e.kind}`;

type Cluster = { x: number; kind: TimelineEvent['kind']; events: TimelineEvent[] };

// Dots that would overlap at this zoom merge into one, shown as the most serious kind with a count.
// mergePx is the tap box width when dots can be tapped, so no box ever covers another dot.
const clusterize = (events: TimelineEvent[], xOf: (t: number) => number, mergePx: number): Cluster[] => {
	const groups: { first: number; events: TimelineEvent[] }[] = [];
	[...events]
		.sort((a, b) => a.t - b.t)
		.forEach((e) => {
			const ex = xOf(e.t);
			const last = groups[groups.length - 1];
			// Measured from the group's first dot, where the merged dot is drawn: every flag in it is within mergePx,
			// and merged dots stay at least mergePx apart, so tap boxes never cover each other.
			if (last && ex - last.first < mergePx) last.events.push(e);
			else groups.push({ first: ex, events: [e] });
		});
	return groups.map((g) => ({
		x: g.first,
		kind: g.events.reduce<TimelineEvent['kind']>((k, e) => (SEVERITY[e.kind] > SEVERITY[k] ? e.kind : k), 'yellow'),
		events: g.events,
	}));
};

// Axis labels placed by x, at least TICK_SPACING apart.
const ticksFor = (mode: Mode, from: number, span: number, inner: number, width: number) => {
	const xOf = (offset: number) => PAD + (inner * offset) / span;
	const ticks: { left: number; label: string }[] = [];
	// Labels are TICK_SPACING wide, centred on their x but kept inside the chart; skip any that would touch the last one.
	const add = (x: number, label: string) => {
		const left = Math.min(Math.max(0, x - TICK_SPACING / 2), width - TICK_SPACING);
		if (!ticks.length || left - ticks[ticks.length - 1].left >= TICK_SPACING) ticks.push({ left, label });
	};
	if (mode === 'calendar') {
		// Every 1, 2, 3, 6 or 12 months, whichever keeps labels apart even after the end ones are pulled inward.
		const pxPerMonth = (inner * 30.44 * DAY) / span;
		const months =
			[1, 2, 3, 6, 12].find((m) => m * pxPerMonth >= MIN_STEP_PX) ?? Math.ceil(MIN_STEP_PX / pxPerMonth / 12) * 12;
		const d = new Date(from);
		d.setDate(1);
		d.setHours(0, 0, 0, 0);
		if (+d < from) d.setMonth(d.getMonth() + 1);
		while (d.getMonth() % Math.min(months, 12)) d.setMonth(d.getMonth() + 1);
		for (; +d <= from + span; d.setMonth(d.getMonth() + months)) {
			add(
				xOf(+d - from),
				d.toLocaleDateString(undefined, d.getMonth() === 0 ? { month: 'short', year: '2-digit' } : { month: 'short' }),
			);
		}
		return ticks;
	}
	const pxPerDay = inner / (span / DAY);
	const step =
		[1, 2, 7, 14, 30, 60, 90, 180, 365].find((s) => s * pxPerDay >= MIN_STEP_PX) ??
		Math.ceil(MIN_STEP_PX / pxPerDay / 365) * 365;
	for (let day = 0; day * DAY <= span; day += step) {
		const label =
			day === 0
				? 'Start'
				: step < 7
					? `Day ${day + 1}`
					: step < 30
						? `${day / 7} wk`
						: step < 365
							? `${Math.round(day / 30)} mo`
							: `${Math.round(day / 365)} yr`;
		add(xOf(day * DAY), label);
	}
	return ticks;
};

export const Timeline = ({ from, to, people }: { from: number; to: number; people: TimelinePerson[] }) => {
	const [mode, setMode] = useState<Mode>('calendar');
	const [zoom, setZoom] = useState(1);
	const [visibleWidth, setVisibleWidth] = useState(0);
	// Kept by event keys, so reloaded history can't point the panel at a different event.
	const [selected, setSelected] = useState<{ personId: string; keys: string[] } | null>(null);
	const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
	const scrollX = useRef(0);
	const lastZoom = useRef(1);
	const focal = useRef(0); // x within the visible chart that stays put while zooming
	const pinchFrom = useRef<number | null>(null); // zoom when the current pinch started

	const width = visibleWidth * zoom;
	const inner = Math.max(1, width - PAD * 2);
	const span = mode === 'calendar' ? Math.max(DAY, to - from) : Math.max(DAY, ...people.map((p) => p.end - p.start));
	const x = (p: TimelinePerson, t: number) =>
		PAD + inner * Math.min(1, Math.max(0, (t - (mode === 'calendar' ? from : p.start)) / span));
	const tappable = zoom >= TAP_ZOOM;

	const zoomTo = (z: number, at = visibleWidth / 2) => {
		focal.current = at;
		setZoom(Math.min(ZOOMS[ZOOMS.length - 1], Math.max(ZOOMS[0], z)));
	};
	const zoomOut = [...ZOOMS].reverse().find((z) => z < zoom - 0.01);
	const zoomIn = ZOOMS.find((z) => z > zoom + 0.01);
	const zoomLabel = +zoom.toFixed(1);

	// Plain JS callbacks: every step re-lays out the dots anyway, so there is nothing to run on the UI thread.
	// A pinch only starts with two fingers, so one-finger scrolling and dot taps are left alone; on iOS, whichever of
	// the pinch and the scroll view's pan starts first makes the other fail.
	const pinch = usePinchGesture({
		disableReanimated: true,
		onActivate: () => {
			pinchFrom.current = lastZoom.current;
		},
		onUpdate: (e) => {
			if (pinchFrom.current === null || !visibleWidth) return;
			zoomTo(pinchFrom.current * e.scale, Math.min(visibleWidth, Math.max(0, e.focalX - NAME_WIDTH)));
		},
		onFinalize: () => {
			if (pinchFrom.current === null) return;
			pinchFrom.current = null;
			// Settle on a button level when the pinch stops close to one, so 1.97x doesn't leave the dots untappable.
			const near = ZOOMS.find((z) => Math.abs(lastZoom.current / z - 1) < 0.05);
			if (near) zoomTo(near, focal.current);
		},
	});

	// Zooming keeps the point under the fingers (or, with the buttons, the middle) where it was.
	// A layout effect, so the scroll moves in the same frame as the wider track.
	useLayoutEffect(() => {
		if (!visibleWidth) return;
		const before = Math.max(1, visibleWidth * lastZoom.current - PAD * 2);
		const point = PAD + ((scrollX.current + focal.current - PAD) * inner) / before;
		lastZoom.current = zoom;
		const target = Math.max(0, Math.min(point - focal.current, width - visibleWidth));
		scrollRef.current?.scrollTo({ x: target, animated: false });
		scrollX.current = target;
		// Dots merge differently at each zoom, so a selection wouldn't keep its shape.
		setSelected(null);
	}, [zoom]);

	const person = selected ? people.find((p) => p.id === selected.personId) : undefined;
	const shown = person && selected ? person.events.filter((e) => selected.keys.includes(keyOf(e))) : [];
	const ticks = visibleWidth ? ticksFor(mode, from, span, inner, width) : [];
	const describe = (p: TimelinePerson, e: TimelineEvent) =>
		`${e.title}, ${KIND[e.kind].label.toLowerCase()}, ${longDate(e.t)}, day ${dayOf(p, e.t)}`;
	const select = (p: TimelinePerson, c: Cluster, on: boolean) => {
		if (on) return setSelected(null);
		setSelected({ personId: p.id, keys: c.events.map(keyOf) });
		// VoiceOver ignores live regions, so say what the panel now shows.
		AccessibilityInfo.announceForAccessibility(
			`${p.name}: ${c.events.map((e) => describe(p, e) + (e.reason ? `. ${e.reason}` : '')).join('. ')}`,
		);
	};
	const summary = people
		.map((p) => {
			const counts = (['yellow', 'red', 'dealbreaker'] as const)
				.map((k) => `${p.events.filter((e) => e.kind === k).length} ${k}`)
				.join(', ');
			const first = p.events[0] ? `, first flag on day ${dayOf(p, p.events[0].t)}` : '';
			return `${p.name}${p.ended ? ', ended' : ''}: ${counts}${first}`;
		})
		.join('. ');

	return (
		<View>
			<View style={styles.controls}>
				<View style={styles.segment} accessibilityRole='tablist'>
					{(['calendar', 'aligned'] as const).map((m) => (
						<Pressable
							key={m}
							accessibilityRole='tab'
							accessibilityState={{ selected: mode === m }}
							style={[styles.segmentButton, mode === m && styles.segmentOn]}
							onPress={() => setMode(m)}>
							<Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>
								{m === 'calendar' ? 'Calendar' : 'Aligned'}
							</Text>
						</Pressable>
					))}
				</View>
				<View style={styles.zoom}>
					<Pressable
						accessibilityRole='button'
						accessibilityLabel='Zoom out'
						accessibilityState={{ disabled: !zoomOut }}
						disabled={!zoomOut}
						style={[styles.zoomButton, !zoomOut && styles.disabled]}
						onPress={() => zoomOut && zoomTo(zoomOut)}>
						<Feather name='zoom-out' size={22} color={colors.blurple} />
					</Pressable>
					<Text
						style={styles.zoomText}
						accessibilityLabel={`Zoom ${zoomLabel} times`}
						accessibilityHint='Pinch or use the zoom buttons'>
						{zoomLabel}×
					</Text>
					<Pressable
						accessibilityRole='button'
						accessibilityLabel='Zoom in'
						accessibilityState={{ disabled: !zoomIn }}
						disabled={!zoomIn}
						style={[styles.zoomButton, !zoomIn && styles.disabled]}
						onPress={() => zoomIn && zoomTo(zoomIn)}>
						<Feather name='zoom-in' size={22} color={colors.blurple} />
					</Pressable>
				</View>
			</View>

			<Text style={styles.hint}>
				{mode === 'aligned' ? 'Everyone starts at day 0. Line length is how long it lasted. ' : 'Real dates. '}
				{tappable ? 'Tap a dot to see what happened.' : 'Zoom in to tap the dots.'}
			</Text>

			<View style={styles.legend} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
				{[
					{ label: 'Dating', color: colors.blurple, radius: 2 },
					{ label: 'Ended', color: colors.bay, radius: 2 },
					...(['yellow', 'red', 'dealbreaker'] as const).map((k) => ({
						label: k === 'dealbreaker' ? 'Dealbreaker' : k === 'red' ? 'Red' : 'Yellow',
						color: KIND[k].color,
						radius: KIND[k].radius,
					})),
				].map((i) => (
					<View key={i.label} style={styles.legendItem}>
						<View style={[styles.swatch, { backgroundColor: i.color, borderRadius: i.radius }]} />
						<Text style={styles.legendText}>{i.label}</Text>
					</View>
				))}
			</View>

			<GestureDetector gesture={pinch}>
				<View
					style={styles.chart}
					accessible={!tappable}
					accessibilityLabel={tappable ? undefined : summary}
					accessibilityHint={tappable ? undefined : 'Pinch or use the zoom buttons'}>
					<View style={{ width: NAME_WIDTH }}>
						{people.map((p) => (
							<Text key={p.id} style={[styles.name, p.ended && styles.ended]} numberOfLines={1}>
								{p.name}
							</Text>
						))}
					</View>
					<ScrollView
						ref={scrollRef}
						horizontal
						style={{ flex: 1 }}
						onLayout={(e) => setVisibleWidth(e.nativeEvent.layout.width)}
						// Ignored mid-pinch: a late event from an earlier step would move the point under the fingers.
						onScroll={(e) => {
							if (pinchFrom.current === null) scrollX.current = e.nativeEvent.contentOffset.x;
						}}
						scrollEventThrottle={32}
						showsHorizontalScrollIndicator={zoom > 1}>
						<View style={{ width }}>
							{people.map((p) => (
								<View key={p.id} style={styles.track}>
									{/* Nothing is drawn until the width is known, so the first frame doesn't flash dots at the left edge. */}
									{visibleWidth ? (
										<>
											<View
												style={[
													styles.line,
													{
														left: x(p, p.start),
														width: Math.max(2, x(p, p.end) - x(p, p.start)),
														backgroundColor: p.ended ? colors.bay : colors.blurple,
													},
												]}
											/>
											{p.ended ? <View style={[styles.endMark, { left: x(p, p.end) - 1 }]} /> : null}
											{clusterize(p.events, (t) => x(p, t), tappable ? ROW : 14).map((c) => {
												const on =
													selected?.personId === p.id && c.events.some((e) => selected.keys.includes(keyOf(e)));
												const many = c.events.length > 1;
												const size = (many ? 18 : 12) + (on ? 6 : 0);
												const dot = (
													<View
														style={[
															styles.dot,
															{
																width: size,
																height: size,
																borderRadius: c.kind === 'dealbreaker' ? 3 : size / 2,
																backgroundColor: KIND[c.kind].color,
																borderColor: on ? colors.black : colors.officer,
																borderWidth: on ? 3 : 1,
															},
														]}>
														{many ? (
															<Text style={[styles.count, c.kind === 'dealbreaker' && { color: colors.white }]}>
																{c.events.length}
															</Text>
														) : null}
													</View>
												);
												const box = [styles.dotBox, { left: c.x - ROW / 2 }];
												return tappable ? (
													<Pressable
														key={keyOf(c.events[0])}
														accessibilityRole='button'
														accessibilityLabel={`${p.name}: ${c.events.map((e) => describe(p, e)).join('; ')}`}
														accessibilityState={{ selected: on }}
														style={box}
														onPress={() => select(p, c, on)}>
														{dot}
													</Pressable>
												) : (
													<View key={keyOf(c.events[0])} style={box}>
														{dot}
													</View>
												);
											})}
										</>
									) : null}
								</View>
							))}
							<View style={styles.ticks}>
								{ticks.map((t, i) => (
									<Text key={i} numberOfLines={1} style={[styles.tick, { left: t.left }]}>
										{t.label}
									</Text>
								))}
							</View>
						</View>
					</ScrollView>
				</View>
			</GestureDetector>

			{person && shown.length ? (
				<View style={styles.detail}>
					<View style={styles.detailHeader}>
						<Text style={[styles.detailTitle, { flex: 1 }]}>
							{person.name}
							{shown.length > 1 ? ` · ${shown.length} flags` : ''}
						</Text>
						<CloseButton onPress={() => setSelected(null)} />
					</View>
					{shown.map((e) => (
						<View key={keyOf(e)} style={styles.detailItem}>
							<Text style={styles.detailCard}>{e.title}</Text>
							<Text style={styles.detailMeta}>
								{KIND[e.kind].label} · {shortDate(e.t)} · day {dayOf(person, e.t)}
							</Text>
							{e.reason ? <Text style={styles.detailReason}>"{e.reason}"</Text> : null}
						</View>
					))}
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
	segment: { flexDirection: 'row', borderWidth: 2, borderColor: colors.blurple, borderRadius: 8, overflow: 'hidden' },
	segmentButton: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
	segmentOn: { backgroundColor: colors.blurple },
	segmentText: { fontSize: 16, fontWeight: 'bold', color: colors.blurple },
	segmentTextOn: { color: colors.white },
	zoom: { flexDirection: 'row', alignItems: 'center' },
	zoomButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	zoomText: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: colors.officer },
	disabled: { opacity: 0.35 },
	hint: { fontSize: 14, color: colors.officer, marginBottom: 8 },
	legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
	swatch: { width: 14, height: 14, borderWidth: 1, borderColor: colors.officer },
	legendText: { fontSize: 14, color: colors.officer },
	chart: { flexDirection: 'row' },
	name: { height: ROW, lineHeight: ROW, fontSize: 14, color: colors.black },
	ended: { color: colors.officer, fontStyle: 'italic' },
	track: { height: ROW },
	line: { position: 'absolute', top: (ROW - 4) / 2, height: 4, borderRadius: 2 },
	endMark: { position: 'absolute', top: (ROW - 16) / 2, width: 2, height: 16, backgroundColor: colors.bay },
	dotBox: { position: 'absolute', top: 0, width: ROW, height: ROW, alignItems: 'center', justifyContent: 'center' },
	dot: { alignItems: 'center', justifyContent: 'center' },
	count: { fontSize: 11, fontWeight: 'bold', color: colors.black },
	ticks: { height: 20, marginTop: 4 },
	tick: { position: 'absolute', width: TICK_SPACING, textAlign: 'center', fontSize: 12, color: colors.officer },
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
	detailItem: { gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e5e5' },
	detailCard: { fontSize: 16, fontWeight: 'bold', color: colors.black },
	detailTitle: { fontSize: 16, fontWeight: 'bold', color: colors.black },
	detailMeta: { fontSize: 14, color: colors.officer },
	detailReason: { fontSize: 15, color: colors.black, fontStyle: 'italic' },
});
