// Type definitions
interface Layout {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface BoardColumn {
	id(): string | number;
	updateLastItemVisibility(): void;
	layout?(): Layout | undefined;
}

interface BoardItem {
	id(): string | number;
	index(): number;
	columnId(): string | number;
	layout(): Layout | undefined;
	ref(): unknown;
	setVisible(visible: boolean): void;
	setIndex(index: number): void;
	setLayout(layout: Layout): void;
	setRef(ref: unknown): void;
}

interface ScrollingPosition {
	offset: number;
	scrolling: boolean;
}

class PositionCalculator {
	private TRESHOLD = 100;

	columnAtPosition = (
		columns: BoardColumn[],
		columnId: string | number
	): BoardColumn | null => {
		const column = columns.find(
			(col: BoardColumn, index: number) => index === columnId
		);

		return column || null;
	};

	scrollingPosition = (
		column: BoardColumn,
		x: number,
		y: number
	): ScrollingPosition | undefined => {
		const layout = column.layout?.();
		if (layout !== undefined) {
			const upperEnd = layout.y;
			const upper =
				y > upperEnd - this.TRESHOLD && y < upperEnd + this.TRESHOLD;

			const lowerEnd = layout.y + layout.height;
			const lower =
				y > lowerEnd - this.TRESHOLD && y < lowerEnd + this.TRESHOLD;

			const offset = lower ? 1 : upper ? -1 : 0;

			return {
				offset,
				scrolling: lower || upper,
			};
		} else {
			console.log('scrollingPosition', layout);
			return undefined;
		}
	};

	selectItem = (
		y: number,
		draggedItem: BoardItem,
		item: BoardItem
	): boolean => {
		const layout = item.layout();
		const draggedLayout = draggedItem.layout();

		if (!layout || !draggedLayout) {
			return false;
		}

		const heightDiff = Math.abs(draggedLayout.height - layout.height);

		let up: boolean;
		let down: boolean;

		if (heightDiff > layout.height) {
			up = y > layout.y;
			down = y < layout.y + layout.height;
		} else if (y < draggedLayout.y) {
			down = y < layout.y + layout.height - heightDiff;
			up = y > layout.y;
		} else {
			down = y < layout.y + layout.height;
			up = y > layout.y + heightDiff;
		}

		return layout && up && down;
	};

	itemAtPosition = (
		items: BoardItem[],
		columnId: string | number,
		y: number,
		draggedItem: BoardItem
	): BoardItem | null => {
		let item = items.find((i: BoardItem) =>
			this.selectItem(y, draggedItem, i)
		);

		const firstItem = items[0];
		if (
			!item &&
			firstItem &&
			firstItem.layout() &&
			y <= firstItem.layout()!.y
		) {
			item = firstItem;
		}

		const lastItem = items[items.length - 1];
		if (
			!item &&
			lastItem &&
			lastItem.layout() &&
			y >= lastItem.layout()!.y
		) {
			item = lastItem;
		}

		return item || null;
	};
}

export default PositionCalculator;
