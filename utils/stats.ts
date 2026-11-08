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
	attachmentCount?: number;
	timestamp: string;
};

type Card = { id: string; title?: string; flag?: string };
type ProfileBoard = { name?: string; ended?: boolean; flag?: Card[]; dealbreaker?: Card[] };
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
export const isNote = (h: HistoryRow) =>
	!typeChanged(h) && (h.previousStatus || 'white') === (h.newStatus || 'white');
// Taking a flag back down: a lower color, or out of the Dealbreakers column.
export const isStepDown = (h: HistoryRow) =>
	fromDealbreaker(h) ||
	(!typeChanged(h) && (RANK[h.newStatus || 'white'] ?? 0) < (RANK[h.previousStatus || 'white'] ?? 0));

// profile_<ms> ids carry the day the profile was made
export const startedAt = (profileId: string) => {
	const ms = Number(profileId.replace('profile_', ''));
	return Number.isFinite(ms) && ms > 0 ? ms : null;
};

export const overallStats = (board: Board, history: HistoryRow[], names: Record<string, string> = {}) => {
	const people = Object.keys(board).filter((id) => id !== 'main');
	const cards: Card[] = [...(board.main?.flag || []), ...(board.main?.dealbreaker || [])];
	const sorted = [...history].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
	const personHistory = sorted.filter((h) => h.profileId !== 'main');

	// The highest a card ever got with each person: today's board, or anything in its history.
	const peak = new Map<string, number>(); // `${profileId}|${flagId}` -> 0 white, 1 yellow, 2 red, 3 dealbreaker
	const raise = (key: string, level: number) => peak.set(key, Math.max(peak.get(key) ?? 0, level));
	people.forEach((pid) => {
		board[pid]?.flag?.forEach((c) => raise(`${pid}|${c.id}`, RANK[c.flag || 'white'] ?? 0));
		board[pid]?.dealbreaker?.forEach((c) => raise(`${pid}|${c.id}`, 3));
	});
	personHistory.forEach((h) => {
		raise(`${h.profileId}|${h.flagId}`, toDealbreaker(h) ? 3 : RANK[h.newStatus || 'white'] ?? 0);
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
		.sort((a, b) => b.dealbreaker - a.dealbreaker || b.red - a.red || b.yellow - a.yellow);

	// Cards you flag on almost everyone may say more about you than about them.
	const yourPatterns =
		people.length >= 3 ? perCard.filter((c) => c.reached / people.length >= 0.75) : [];

	// Which cards were red or dealbreakers on each ended person.
	const endings = people
		.filter((pid) => board[pid]?.ended)
		.map((pid) => ({
			id: pid,
			name: names[pid] || board[pid]?.name || 'Unnamed',
			cards: [
				...(board[pid]?.dealbreaker || []).map((c) => ({ title: c.title || '', dealbreaker: true })),
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

	return {
		people: people.length,
		ended: people.filter((pid) => board[pid]?.ended).length,
		perCard,
		yourPatterns,
		endings,
		yellowToRedDays: median(yellowToRed),
		yellowToRedCount: yellowToRed.length,
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
	name?: string
) => {
	const profile = board[profileId] || {};
	const rows = history
		.filter((h) => h.profileId === profileId)
		.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
	const start = startedAt(profileId);
	const flags = profile.flag || [];

	// Entries per month, newest month first, e.g. { month: 'Nov 2026', notes: 3, changes: 2 }
	const months: { key: string; month: string; notes: number; changes: number }[] = [];
	rows.forEach((h) => {
		const d = new Date(h.timestamp);
		const key = `${d.getFullYear()}-${d.getMonth()}`;
		let m = months.find((x) => x.key === key);
		if (!m) {
			m = { key, month: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), notes: 0, changes: 0 };
			months.push(m);
		}
		if (isNote(h)) m.notes++;
		else m.changes++;
	});

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
