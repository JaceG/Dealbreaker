import { range } from 'lodash';
import Registry from './Registry';
import PositionCalculator from './PositionCalculator';
import Mover from './Mover';

// Type definitions for the board system
interface Layout {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface RowData {
	id: string | number;
	[key: string]: unknown;
}

interface ColumnData {
	id: string | number;
	rows: RowData[];
	[key: string]: unknown;
}

interface BoardItem {
	id(): string | number;
	index(): number;
	columnId(): string | number;
	layout(): Layout | undefined;
	ref(): unknown;
	setRef(ref: unknown): void;
	measureAndSaveLayout(previousItem?: BoardItem): void;
	setVisible(visible: boolean): void;
	setHidden(hidden: boolean): void;
	setIndex(index: number): void;
	setLayout(layout: Layout): void;
}

interface BoardColumn {
	id(): string | number;
	setScrollOffset(offset: number): void;
	setContentHeight(height: number): void;
	setListView(listView: unknown): void;
	setRef(ref: unknown): void;
	measureAndSaveLayout(): void;
	updateLastItemVisibility(): void;
	layout?():
		| { x: number; y: number; width: number; height: number }
		| undefined;
}

interface VisibleItemsInSections {
	s1: { [key: number]: boolean };
}

interface Listeners {
	[columnId: string]: {
		[event: string]: () => void;
	};
}

class BoardRepository {
	private registry: Registry;
	private positionCalculator: PositionCalculator;
	private mover: Mover;
	private listeners: Listeners;

	constructor(data: ColumnData[]) {
		this.registry = new Registry(data);
		this.positionCalculator = new PositionCalculator();
		this.mover = new Mover(this.positionCalculator);
		this.listeners = {};
	}

	updateData(data: ColumnData[]): void {
		this.registry.updateData(data);
		this.updateColumnsLayoutAfterVisibilityChanged();
	}

	columns = (): BoardColumn[] => this.registry.columns();

	column = (columnId: string | number): BoardColumn =>
		this.registry.column(columnId);

	items = (columnId: string | number): BoardItem[] =>
		this.registry.items(columnId);

	visibleItems = (columnId: string | number): BoardItem[] =>
		this.registry.visibleItems(columnId);

	addListener = (
		columnId: string | number,
		event: string,
		callback: () => void
	): void => {
		const forColumn = this.listeners[columnId.toString()];
		this.listeners[columnId.toString()] = Object.assign(forColumn || {}, {
			[event]: callback,
		});
	};

	notify = (columnId: string | number, event: string): void => {
		const columnKey = columnId.toString();
		if (this.listeners[columnKey]) {
			this.listeners[columnKey][event]();
		}
	};

	setScrollOffset = (
		columnId: string | number,
		scrollOffset: number
	): void => {
		const column = this.registry.column(columnId);
		column.setScrollOffset(scrollOffset);
	};

	setContentHeight = (
		columnId: string | number,
		contentHeight: number
	): void => {
		const column = this.registry.column(columnId);
		column.setContentHeight(contentHeight);
	};

	setItemRef = (
		columnId: string | number,
		item: BoardItem,
		ref: unknown
	): void => {
		item.setRef(ref);
	};

	setListView = (columnId: string | number, listView: unknown): void => {
		const column = this.registry.column(columnId);

		if (column) {
			column.setListView(listView);
		}
	};

	updateItemWithLayout = (
		columnId: string | number,
		item: BoardItem,
		previousItem?: BoardItem
	): void => {
		item.measureAndSaveLayout(previousItem);
	};

	updateLayoutAfterVisibilityChanged = (columnId: string | number): void => {
		const items = this.items(columnId);
		const rangeArr = range(items.length);

		rangeArr.forEach((i) => {
			this.updateItemWithLayout(columnId, items[i], items[i - 1]);
		});
	};

	updateItemsVisibility = (
		columnId: string | number,
		visibleItemsInSections: VisibleItemsInSections
	): void => {
		const visibleItems = visibleItemsInSections.s1;
		const items = this.items(columnId);

		this.updateLayoutAfterVisibilityChanged(columnId);

		items.forEach(
			(item: BoardItem) =>
				visibleItems && item.setVisible(visibleItems[item.index()])
		);
	};

	setColumnRef = (columnId: string | number, ref: unknown): void => {
		const column = this.registry.column(columnId);

		if (column) {
			column.setRef(ref);
		}
	};

	updateColumnWithLayout = (columnId: string | number): void => {
		const column = this.registry.column(columnId);

		if (column) {
			column.measureAndSaveLayout();
		}
	};

	scrollingPosition = (
		columnAtPosition: BoardColumn,
		x: number,
		y: number,
		columnId: string | number
	): void => {
		this.positionCalculator.scrollingPosition(columnAtPosition, x, y);
	};

	updateColumnsLayoutAfterVisibilityChanged = (): void => {
		const columns = this.columns();

		columns.forEach((column: BoardColumn) => {
			const columnId = column.id();
			this.updateColumnWithLayout(columnId);
			this.updateLayoutAfterVisibilityChanged(columnId);
		});
	};

	hide = (columnId: string | number, item: BoardItem): void => {
		item.setHidden(true);
	};

	show = (columnId: string | number, item: BoardItem): void => {
		item.setHidden(false);
	};

	showAll = (): void => {
		const columns = this.columns();
		columns.forEach((column: BoardColumn) => {
			const items = this.items(column.id());

			items.forEach((item: BoardItem) => this.show(column.id(), item));
		});
	};

	move = (
		draggedItem: BoardItem,
		x: number,
		y: number,
		columnId: string | number
	): void => {
		this.mover.move(this, this.registry, draggedItem, x, y, columnId);
	};
}

export default BoardRepository;
