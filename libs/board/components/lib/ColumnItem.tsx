import { filter, omit, sortBy, values } from 'lodash';
import Item from './Item';

// Type definitions for ColumnItem
interface ColumnItemData {
	id: string | number;
	name: string;
	[key: string]: unknown;
}

interface ColumnItemAttributes {
	id: string | number;
	index: number;
	data: ColumnItemData;
	items: { [key: string]: Item };
	scrollOffset: number;
	contentHeight: number;
	ref: unknown;
	layout: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	listView: unknown;
}

interface MeasureCallback {
	(
		ox: number,
		oy: number,
		width: number,
		height: number,
		px: number,
		py: number
	): void;
}

interface RefWithMeasure {
	measure: (callback: MeasureCallback) => void;
}

class ColumnItem {
	private attributes: ColumnItemAttributes;

	constructor(attributes: ColumnItemAttributes) {
		this.attributes = attributes;
	}

	getAttributes = (): ColumnItemAttributes => this.attributes;

	item = (itemId: string | number): Item =>
		this.attributes.items[itemId.toString()];

	data = (): ColumnItemData => this.attributes.data;

	items = (): Item[] => {
		const items = values(this.attributes.items) as Item[];
		const fake = new Item({
			id: -2,
			index: 100000,
			columnId: this.id(),
			row: { id: -2, name: '' },
			hidden: true,
			locked: false,
			visible: false,
		});

		const sortedItems = items.sort(
			(a: Item, b: Item) => a.index() - b.index()
		);
		return sortedItems.concat([fake]);
	};

	visibleItems = (): Item[] =>
		this.items().filter((item: Item) => item.isVisible());

	scrollOffset = (): number => this.attributes.scrollOffset;

	contentHeight = (): number => this.attributes.contentHeight;

	id = (): string | number => this.attributes.id;

	ref = (): unknown => this.attributes.ref;

	index = (): number => this.attributes.index;

	layout = (): { x: number; y: number; width: number; height: number } =>
		this.attributes.layout;

	listView = (): unknown => this.attributes.listView;

	setListView = (listView: unknown): void => {
		this.attributes.listView = listView;
	};

	setScrollOffset = (scrollOffset: number): void => {
		this.attributes.scrollOffset = scrollOffset;
	};

	setContentHeight = (contentHeight: number): void => {
		this.attributes.contentHeight = contentHeight;
	};

	setRef = (ref: unknown): void => {
		this.attributes.ref = ref;
	};

	setLayout = (layout: {
		x: number;
		y: number;
		width: number;
		height: number;
	}): void => {
		this.attributes.layout = layout;
	};

	measureAndSaveLayout = (): void => {
		const ref = this.ref() as RefWithMeasure | null;

		if (ref && ref.measure) {
			ref.measure(
				(
					ox: number,
					oy: number,
					width: number,
					height: number,
					px: number,
					py: number
				) => {
					const layout = { x: px, y: py, width, height };
					this.setLayout(layout);
				}
			);
		}
	};

	setItem = (item: Item): void => {
		this.attributes.items[item.id().toString()] = item;
		item.setColumnId(this.id());
	};

	removeItem = (item: Item): void => {
		this.attributes.items = omit(
			this.attributes.items,
			item.id().toString()
		);
	};

	updateLastItemVisibility = (): void => {
		const visibleItems = this.visibleItems();
		const items = this.items();

		if (visibleItems.length + 1 < items.length) {
			visibleItems[visibleItems.length - 1].setVisible(false);
		}
	};
}

export default ColumnItem;
