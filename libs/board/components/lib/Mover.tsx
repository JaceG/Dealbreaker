/* eslint-disable no-unused-vars */
import { range } from 'lodash';

// Type definitions for Mover
interface Layout {
	x: number;
	y: number;
	width: number;
	height: number;
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

interface BoardColumn {
	id(): string | number;
	updateLastItemVisibility(): void;
}

interface BoardRepository {
	columns(): BoardColumn[];
	visibleItems(columnId: string | number): BoardItem[];
	items(columnId: string | number): BoardItem[];
	notify(columnId: string | number, event: string): void;
}

interface Registry {
	move(
		fromColumnId: string | number,
		toColumnId: string | number,
		item: BoardItem
	): void;
	column(columnId: string | number): BoardColumn;
}

interface PositionCalculator {
	columnAtPosition(
		columns: BoardColumn[],
		columnId: string | number
	): BoardColumn | null;
	itemAtPosition(
		items: BoardItem[],
		columnId: string | number,
		y: number,
		draggedItem: BoardItem
	): BoardItem | null;
}

class Mover {
	private positionCalculator: PositionCalculator;

	constructor(positionCalculator: PositionCalculator) {
		this.positionCalculator = positionCalculator;
	}

	move = (
		boardRepository: BoardRepository,
		registry: Registry,
		draggedItem: BoardItem,
		x: number,
		y: number,
		columnId: string | number
	): BoardColumn | undefined => {
		try {
			const fromColumnId = draggedItem.columnId();
			const columns = boardRepository.columns();
			const columnAtPosition = this.positionCalculator.columnAtPosition(
				columns,
				columnId
			);

			if (!columnAtPosition) {
				return;
			}

			const toColumnId =
				typeof columnId === 'number'
					? columnId + 1
					: Number(columnId) + 1;
			if (toColumnId !== fromColumnId) {
				this.moveToOtherColumn(
					boardRepository,
					registry,
					fromColumnId,
					toColumnId,
					draggedItem
				);
			}

			const items = boardRepository.visibleItems(toColumnId);
			const itemAtPosition = this.positionCalculator.itemAtPosition(
				items,
				toColumnId,
				y,
				draggedItem
			);
			if (!itemAtPosition) {
				return columnAtPosition;
			}

			const draggedId = draggedItem.id();
			const itemAtPositionId = itemAtPosition.id();

			if (draggedItem.id() === itemAtPosition.id()) {
				return columnAtPosition;
			}

			this.switchItemsBetween(
				boardRepository,
				draggedItem,
				itemAtPosition,
				toColumnId
			);

			return columnAtPosition;
		} catch (error) {
			console.log('move ', error);
		}
	};

	moveToOtherColumn = (
		boardRepository: BoardRepository,
		registry: Registry,
		fromColumnId: string | number,
		toColumnId: string | number,
		item: BoardItem
	): void => {
		registry.move(fromColumnId, toColumnId, item);

		boardRepository.notify(fromColumnId, 'reload');

		item.setVisible(true);
		item.setIndex(-1);

		const items = boardRepository.items(toColumnId);
		items.forEach((i: BoardItem) => i.setIndex(i.index() + 1));

		const visibleItems = boardRepository.visibleItems(toColumnId);
		const rangeVisibleItems = range(0, visibleItems.length - 1);

		rangeVisibleItems.forEach((i) => {
			const nextLayout = visibleItems[i + 1].layout();
			if (nextLayout) {
				visibleItems[i].setLayout({ ...nextLayout });
			}
		});

		const lastItem = visibleItems[visibleItems.length - 1];
		const lastLayout = lastItem.layout();
		if (lastLayout) {
			const newLastY = lastLayout.y + lastLayout.height;
			lastItem.setLayout({ ...lastLayout, y: newLastY });
		}

		const column = registry.column(toColumnId);
		column.updateLastItemVisibility();
	};

	switchItemsBetween = (
		boardRepository: BoardRepository,
		draggedItem: BoardItem,
		itemAtPosition: BoardItem,
		toColumnId: string | number
	): void => {
		draggedItem.setVisible(true);

		let items = boardRepository.visibleItems(toColumnId);
		const draggedItemI = items.findIndex(
			(item: BoardItem) => item.id() === draggedItem.id()
		);
		const itemAtPositionI = items.findIndex(
			(item: BoardItem) => item.id() === itemAtPosition.id()
		);
		let itemsRange: number[];

		if (draggedItem.index() < itemAtPosition.index()) {
			itemsRange = range(draggedItemI, itemAtPositionI);
		} else {
			itemsRange = range(itemAtPositionI, draggedItemI);
		}

		itemsRange.forEach((i: number) => {
			const firstItem = items[i];
			const secondItem = items[i + 1];
			this.switchItems(toColumnId, firstItem, secondItem);
			items = boardRepository.visibleItems(toColumnId);
		});

		boardRepository.notify(toColumnId, 'reload');
	};

	switchItems = (
		columnId: string | number,
		firstItem: BoardItem | undefined,
		secondItem: BoardItem | undefined
	): void => {
		if (!firstItem || !secondItem) {
			return;
		}

		const firstLayout = firstItem.layout();
		const secondLayout = secondItem.layout();

		if (!firstLayout || !secondLayout) {
			return;
		}

		const firstId = firstItem.id();
		const secondId = secondItem.id();
		const firstIndex = firstItem.index();
		const secondIndex = secondItem.index();
		const firstY = firstLayout.y;
		const secondHeight = secondLayout.height;
		const firstRef = firstItem.ref();
		const secondRef = secondItem.ref();

		firstItem.setIndex(secondIndex);
		secondItem.setIndex(firstIndex);

		firstItem.setLayout({ ...firstLayout, y: firstY + secondHeight });
		secondItem.setLayout({ ...secondLayout, y: firstY });

		firstItem.setRef(secondRef);
		secondItem.setRef(firstRef);
	};
}

export default Mover;
