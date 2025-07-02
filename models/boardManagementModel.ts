// Import centralized types from dataModels
export type {
	FlagItem,
	ProfileData,
	DealbreakerState,
	Profile,
} from './dataModels';

// Component prop types
export type AppButtonProps = {
	title: string;
	onPress: () => void;
	color?: string;
};

export const data = [
	{
		id: 1,
		name: 'Flags',
		rows: [],
	},
	{
		id: 2,
		name: 'Dealbreakers',
		rows: [],
	},
];

export interface PendingTransition {
	type: 'dealbreaker-to-flag' | 'flag-to-dealbreaker';
	profileId: string;
	profileName: string;
	itemId: string;
	itemTitle: string;
	prevStatus: string;
	newStatus: string;
	prevCardType: 'dealbreaker' | 'flag';
	newCardType: 'dealbreaker' | 'flag';
	newFlagColor: string;
	isUndo?: boolean;
}
