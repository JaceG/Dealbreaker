// Where the person was looking on each board: which column, and how far each column was scrolled.
// The board is torn down and rebuilt after saves, so without this every rebuild jumps back to the
// first column, scrolled to the top. Kept in memory for this launch, per board (person) key.
type View = { col: number; offsets: Record<string, number> };
const views = new Map<string, View>();

export const getView = (key?: string): View =>
	(key && views.get(key)) || { col: 0, offsets: {} };

const view = (key: string) => {
	if (!views.has(key)) views.set(key, { col: 0, offsets: {} });
	return views.get(key)!;
};

export const rememberColumn = (key: string | undefined, col: number) => {
	if (key) view(key).col = col;
};

export const rememberOffset = (key: string | undefined, columnId: string | number, y: number) => {
	if (key) view(key).offsets[String(columnId)] = Math.max(0, y);
};

// Ask a mounted board to show a column now (e.g. the one a card went back to after Cancel).
const columnRequests = new Set<(key: string, col: number) => void>();

export const showColumn = (key: string, col: number) => {
	rememberColumn(key, col);
	columnRequests.forEach((listener) => listener(key, col));
};

export const onShowColumn = (listener: (key: string, col: number) => void) => {
	columnRequests.add(listener);
	return () => {
		columnRequests.delete(listener);
	};
};
