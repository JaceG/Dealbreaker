// Types from app/_layout.tsx
export interface FlagItem {
	id: string;
	[key: string]: any;
}

export interface ProfileData {
	flag: FlagItem[];
	dealbreaker: FlagItem[];
}

export interface DealbreakerState {
	main: ProfileData;
	[profileId: string]: ProfileData;
}

export interface Profile {
	id: string;
	name: string;
}

// Modal/component prop types (fallback to any if not available)
export type SwitchProfileModalProps = {
	visible: boolean;
	onClose: () => void;
};
export type ConfirmationModalProps = {
	visible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
};
export type EditItemModalProps = {
	visible: boolean;
	onClose: () => void;
	onSave: (item: any) => void;
	item: any;
};
export type EditProfileModalProps = {
	visible: boolean;
	onClose: () => void;
	onSave: (profileId: string, newName: string) => void;
	profileId: string;
	profileName: string;
	existingProfiles: Profile[];
};
export type DealbreakerAlertProps = {
	visible: boolean;
	onClose: () => void;
	onUndo: () => void;
	itemTitle: string;
};
export type FlagHistoryModalProps = {
	visible: boolean;
	onClose: () => void;
	profileId: string;
	flagId: string;
	flagTitle: string;
	onAddReason: () => void;
};
export type ReasonInputModalProps = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (reason: string, attachments?: any[]) => void;
	flagTitle: string;
	prevStatus: string;
	newStatus: string;
	modalTitle: string;
};
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
