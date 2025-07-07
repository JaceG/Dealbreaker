import { range, sortBy, values } from 'lodash';
import ColumnItem from './ColumnItem';
import Item from './Item';

// Type definitions for Registry
interface BoardData {
	[key: string]: unknown;
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

interface ItemsMap {
	[key: string]: Item;
}

interface ColumnsMap {
	[key: string]: ColumnItem;
}

interface ExistingAttributes {
	id: string | number;
	index: number;
	scrollOffset: number;
	items: ItemsMap;
}

class Registry {
	private map: ColumnsMap;
	constructor(data: ColumnData[]) {
		this.map = {};
		if (data) {
			this.updateData(data);
		}
	}

	existingColumnAttributes = (columnId: string | number): any => {
		const column = this.column(columnId);

		return column && column.getAttributes();
	};

	buildColumn = (columnIndex: number, columnData: ColumnData): ColumnItem => {
		const columnId = columnData.id;
		const existingAttributes = this.existingColumnAttributes(columnId) || {
			id: columnId,
			index: columnIndex,
			scrollOffset: 0,
			items: {},
		};
		const { rows } = columnData;
		const itemsMap = this.buildItemsMap(
			columnId,
			rows,
			existingAttributes.items
		);

		const colItem = new ColumnItem(
			Object.assign(existingAttributes, {
				items: itemsMap,
				data: columnData,
			})
		);
		colItem.measureAndSaveLayout();
		return colItem;
	};

	existingItemAttributes = (
		existingItems: ItemsMap,
		itemId: string | number
	): any => {
		const item = existingItems[itemId];

		return item && item.getAttributes();
	};

	buildItemsMap = (
		columnId: string | number,
		rows: RowData[],
		existingItems: ItemsMap
	) => {
		const items = range(rows.length).map((index) => {
			const row = rows[index];
			const { id } = row;
			const existingItemAttributes =
				this.existingItemAttributes(existingItems, id) || {};
			const itemDef = new Item(
				Object.assign(existingItemAttributes, {
					id,
					index,
					columnId,
					row,
				})
			);

			return itemDef;
		});

		const itemsMap: ItemsMap = {};
		items.forEach((item, index) => {
			item.measureAndSaveLayout();
			itemsMap[item.id()] = item;
		});

		return itemsMap;
	};

	updateData = (data: ColumnData[]) => {
		this.map = {};
		const columns = range(data.length).map((columnIndex) => {
			const columnData = data[columnIndex];

			return this.buildColumn(columnIndex, columnData);
		});

		columns.forEach((column) => {
			this.map[column.id()] = column;
		});
	};

	move = (
		fromColumnId: string | number,
		toColumnId: string | number,
		item: Item
	) => {
		const fromColumn = this.column(fromColumnId);
		const toColumn = this.column(toColumnId);

		toColumn.setItem(item);
		fromColumn.removeItem(item);
	};

	columns = (): ColumnItem[] => {
		const columns = values(this.map);
		return sortBy(columns, (column) => column.index());
	};

	column = (columnId: string | number): ColumnItem => this.map[columnId];

	items = (columnId: string | number): Item[] => {
		const column = this.column(columnId);

		return (column && column.items()) || [];
	};

	visibleItems = (columnId: string | number): Item[] => {
		const column = this.column(columnId);

		return (column && column.visibleItems()) || [];
	};

	item = (
		columnId: string | number,
		itemId: string | number
	): Item | undefined => {
		const column = this.column(columnId);

		return column && column.item(itemId);
	};
}

export default Registry;
