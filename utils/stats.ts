// Numbers for the Stats screen, worked out from the board and the user's whole history (GET /flagHistory/mine).

export type HistoryRow = {
	profileId: string;
	profileName?: string;
	flagId: string;
	flagTitle?: string;
	previousStatus?: string;
	newStatus?: string;
	cardTypeChange?: string; // 'none' | 'flag-to-dealbreaker' | 'dealbreaker-to-flag'
	previousCardType?: string;
	newCardType?: string;
	reason?: string;
	attachmentCount?: number;
	timestamp: string;
};

export type TimelineEvent = {
	t: number;
	kind: 'yellow' | 'red' | 'dealbreaker';
	flagId: string;
	title: string;
	reason: string;
};

type Card = { id: string; title?: string; flag?: string };
type ProfileBoard = {
	name?: string;
	ended?: boolean;
	flag?: Card[];
	dealbreaker?: Card[];
};
export type Board = Record<string, ProfileBoard>;

const RANK: Record<string, number> = { white: 0, yellow: 1, red: 2 };
const DAY = 86400000;

const median = (values: number[]) => {
	if (!values.length) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const typeChanged = (h: HistoryRow) => !!h.cardTypeChange && h.cardTypeChange !== 'none';
const toDealbreaker = (h: HistoryRow) => typeChanged(h) && h.newCardType === 'dealbreaker';
const fromDealbreaker = (h: HistoryRow) => typeChanged(h) && h.previousCardType === 'dealbreaker';
// A note: Add Context, nothing changed.
export const isNote = (h: HistoryRow) => !typeChanged(h) && (h.previousStatus || 'white') === (h.newStatus || 'white');
// Taking a flag back down: a lower color, or out of the Dealbreakers column.
export const isStepDown = (h: HistoryRow) =>
	fromDealbreaker(h) ||
	(!typeChanged(h) && (RANK[h.newStatus || 'white'] ?? 0) < (RANK[h.previousStatus || 'white'] ?? 0));

// profile_<ms> ids carry the day the profile was made
export const startedAt = (profileId: string) => {
	const ms = Number(profileId.replace('profile_', ''));
	return Number.isFinite(ms) && ms > 0 ? ms : null;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Changes and notes per month, oldest first, every month from `from` to `to` (empty months included).
export const monthlyActivity = (rows: HistoryRow[], from: number, to: number) => {
	const months: {
		key: string;
		label: string;
		changes: number;
		notes: number;
	}[] = [];
	// At most 10 years, keeping the latest months.
	const earliest = new Date(to);
	earliest.setDate(1); // the 31st would roll a month forward
	earliest.setMonth(earliest.getMonth() - 119);
	const cursor = new Date(Math.max(from, +earliest));
	cursor.setDate(1);
	cursor.setHours(0, 0, 0, 0);
	while (+cursor <= to) {
		months.push({
			key: monthKey(cursor),
			label: cursor.toLocaleDateString(undefined, { month: 'short' }),
			changes: 0,
			notes: 0,
		});
		cursor.setMonth(cursor.getMonth() + 1);
	}
	rows.forEach((h) => {
		const m = months.find((x) => x.key === monthKey(new Date(h.timestamp)));
		if (!m) return;
		if (isNote(h)) m.notes++;
		else m.changes++;
	});
	return months;
};

// A flag showing up: white to yellow, anything to red, or a move into the Dealbreakers column. Other entries are not dots.
export const timelineEvent = (h: HistoryRow): TimelineEvent | null => {
	const kind = toDealbreaker(h)
		? 'dealbreaker'
		: typeChanged(h)
			? null
			: h.newStatus === 'red' && h.previousStatus !== 'red'
				? 'red'
				: h.newStatus === 'yellow' && (h.previousStatus || 'white') === 'white'
					? 'yellow'
					: null;
	if (!kind) return null;
	return { t: +new Date(h.timestamp), kind, flagId: h.flagId, title: h.flagTitle || '', reason: h.reason || '' };
};

export const YELLOW_TO_RED_BUCKETS = [
	{ label: 'Under a week', max: 7 },
	{ label: '1–2 weeks', max: 14 },
	{ label: '2–4 weeks', max: 28 },
	{ label: '4 weeks or more', max: Infinity },
];

export const overallStats = (
	board: Board,
	history: HistoryRow[],
	names: Record<string, string> = {},
	now = Date.now(),
) => {
	const people = Object.keys(board).filter((id) => id !== 'main');
	const cards: Card[] = [...(board.main?.flag || []), ...(board.main?.dealbreaker || [])];
	const sorted = [...history].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
	// People still on the board; history left by deleted profiles would skew every number.
	const personHistory = sorted.filter((h) => h.profileId !== 'main' && board[h.profileId]);

	// The highest a card ever got with each person: today's board, or anything in its history.
	const peak = new Map<string, number>(); // `${profileId}|${flagId}` -> 0 white, 1 yellow, 2 red, 3 dealbreaker
	const raise = (key: string, level: number) => peak.set(key, Math.max(peak.get(key) ?? 0, level));
	people.forEach((pid) => {
		board[pid]?.flag?.forEach((c) => raise(`${pid}|${c.id}`, RANK[c.flag || 'white'] ?? 0));
		board[pid]?.dealbreaker?.forEach((c) => raise(`${pid}|${c.id}`, 3));
	});
	personHistory.forEach((h) => {
		raise(`${h.profileId}|${h.flagId}`, toDealbreaker(h) ? 3 : (RANK[h.newStatus || 'white'] ?? 0));
	});

	const perCard = cards
		.map((card) => {
			const levels = people.map((pid) => peak.get(`${pid}|${card.id}`) ?? 0);
			return {
				id: card.id,
				title: card.title || '',
				yellow: levels.filter((l) => l === 1).length,
				red: levels.filter((l) => l === 2).length,
				dealbreaker: levels.filter((l) => l === 3).length,
				reached: levels.filter((l) => l >= 1).length,
			};
		})
		.filter((c) => c.reached > 0)
		// Most people first, then the most serious.
		.sort((a, b) => b.reached - a.reached || b.dealbreaker - a.dealbreaker || b.red - a.red || b.yellow - a.yellow);

	// Cards you flag on almost everyone may say more about you than about them.
	const yourPatterns = people.length >= 3 ? perCard.filter((c) => c.reached / people.length >= 0.75) : [];

	// Which cards were red or dealbreakers on each ended person.
	const endings = people
		.filter((pid) => board[pid]?.ended)
		.map((pid) => ({
			id: pid,
			name: names[pid] || board[pid]?.name || 'Unnamed',
			cards: [
				...(board[pid]?.dealbreaker || []).map((c) => ({
					title: c.title || '',
					dealbreaker: true,
				})),
				...(board[pid]?.flag || [])
					.filter((c) => c.flag === 'red')
					.map((c) => ({ title: c.title || '', dealbreaker: false })),
			],
		}));

	// Days from a card's first yellow to its first red with the same person.
	const firstYellow = new Map<string, number>();
	const yellowToRed: number[] = [];
	const counted = new Set<string>();
	personHistory.forEach((h) => {
		const key = `${h.profileId}|${h.flagId}`;
		const t = +new Date(h.timestamp);
		if (h.newStatus === 'yellow' && !firstYellow.has(key)) firstYellow.set(key, t);
		if (h.newStatus === 'red' && firstYellow.has(key) && !counted.has(key)) {
			counted.add(key);
			yellowToRed.push((t - firstYellow.get(key)!) / DAY);
		}
	});

	const changes = personHistory.filter((h) => !isNote(h));
	const stepDowns = changes.filter(isStepDown).length;

	// One row per person for the timeline: from the profile's start to its last entry if ended, else today,
	// with a dot each time a card turned yellow from white, turned red, or became a dealbreaker.
	const timeline = people
		.map((pid) => {
			const rows = personHistory.filter((h) => h.profileId === pid);
			const start = startedAt(pid) ?? (rows[0] ? +new Date(rows[0].timestamp) : now);
			const last = rows.length ? +new Date(rows[rows.length - 1].timestamp) : start;
			return {
				id: pid,
				name: names[pid] || board[pid]?.name || 'Unnamed',
				ended: !!board[pid]?.ended,
				start,
				end: board[pid]?.ended ? Math.max(last, start) : now,
				events: rows.map(timelineEvent).filter((e): e is TimelineEvent => e !== null),
			};
		})
		.sort((a, b) => a.start - b.start);
	const from = timeline.length ? Math.min(...timeline.map((p) => p.start)) : now;

	// Today's flags per person, worst first.
	const byPerson = people
		.map((pid) => {
			const flags = board[pid]?.flag || [];
			return {
				id: pid,
				name: names[pid] || board[pid]?.name || 'Unnamed',
				ended: !!board[pid]?.ended,
				yellow: flags.filter((c) => c.flag === 'yellow').length,
				red: flags.filter((c) => c.flag === 'red').length,
				dealbreaker: (board[pid]?.dealbreaker || []).length,
			};
		})
		.sort((a, b) => b.dealbreaker - a.dealbreaker || b.red - a.red || b.yellow - a.yellow);

	return {
		people: people.length,
		ended: people.filter((pid) => board[pid]?.ended).length,
		perCard,
		yourPatterns,
		endings,
		yellowToRedDays: median(yellowToRed),
		yellowToRedCount: yellowToRed.length,
		yellowToRedBuckets: YELLOW_TO_RED_BUCKETS.map((b, i) => ({
			label: b.label,
			count: yellowToRed.filter((d) => d < b.max && (i === 0 || d >= YELLOW_TO_RED_BUCKETS[i - 1].max)).length,
		})),
		monthly: monthlyActivity(personHistory, from, now),
		timeline: { from, to: now, people: timeline },
		byPerson,
		changes: changes.length,
		stepDowns,
		notes: personHistory.length - changes.length,
	};
};

export const personStats = (
	board: Board,
	history: HistoryRow[],
	profileId: string,
	now = Date.now(),
	name?: string,
) => {
	const profile = board[profileId] || {};
	const rows = history
		.filter((h) => h.profileId === profileId)
		.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
	const start = startedAt(profileId);
	const flags = profile.flag || [];

	// Entries per month, oldest first, from the profile's start to its last entry (ended) or today.
	const first = start ?? (rows.length ? +new Date(rows[rows.length - 1].timestamp) : now);
	// Same end as the timeline: an ended person's last entry, or their start when they have none.
	const last = profile.ended ? (rows.length ? +new Date(rows[0].timestamp) : first) : now;
	const months = monthlyActivity(rows, first, Math.max(first, last));

	return {
		name: name || profile.name || 'Unnamed',
		ended: !!profile.ended,
		days: start ? Math.max(0, Math.floor((now - start) / DAY)) : null,
		red: flags.filter((c) => c.flag === 'red').length,
		yellow: flags.filter((c) => c.flag === 'yellow').length,
		dealbreakers: (profile.dealbreaker || []).length,
		entries: rows.length,
		notes: rows.filter(isNote).length,
		stepDowns: rows.filter(isStepDown).length,
		months,
		latest: rows.slice(0, 10),
	};
};
