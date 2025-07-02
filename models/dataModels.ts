// =============================================================================
// CORE DATA TYPES (Business Domain Models)
// =============================================================================

// Enhanced FlagItem with all possible properties
export interface FlagItem {
	id: string;
	title?: string;
	description?: string;
	color?: string;
	status?: 'active' | 'inactive' | 'archived';
	priority?: 'low' | 'medium' | 'high' | 'critical';
	category?: string;
	tags?: string[];
	createdAt?: string;
	updatedAt?: string;
	metadata?: Record<string, any>;
	[key: string]: any; // For flexibility
}

// Enhanced Profile with additional fields
export interface Profile {
	id: string;
	name: string;
	description?: string;
	avatar?: string;
	isDefault?: boolean;
	createdAt?: string;
	updatedAt?: string;
	settings?: ProfileSettings;
	metadata?: Record<string, any>;
}

// Profile settings
export interface ProfileSettings {
	theme?: 'light' | 'dark' | 'auto';
	notifications?: boolean;
	autoSync?: boolean;
	sortPreference?: 'alphabetical' | 'date' | 'priority' | 'custom';
	defaultView?: 'list' | 'grid' | 'kanban';
}

// Profile data structure
export interface ProfileData {
	flag: FlagItem[];
	dealbreaker: FlagItem[];
}

// Complete dealbreaker state
export interface DealbreakerState {
	main: ProfileData;
	[profileId: string]: ProfileData;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

// Validation error for form fields
export interface ValidationError {
	field: string;
	message: string;
	code?: string;
}

// Form validation result
export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

// Generic form error state
export interface FormErrorState {
	[fieldName: string]: string;
}

// Specific form error states
export interface CreateProfileErrorState {
	name: string;
}

export interface CreateFlagErrorState {
	title: string;
	description: string;
}

export interface LoginErrorState {
	email: string;
	password: string;
	general: string;
}

export interface RegisterErrorState extends LoginErrorState {
	name: string;
	confirmPassword: string;
}

// =============================================================================
// FILE & ATTACHMENT TYPES
// =============================================================================

// File types
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';

// Supported image formats
export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'svg';

// Supported video formats
export type VideoFormat = 'mp4' | 'avi' | 'mov' | 'wmv' | 'flv' | 'webm';

// Supported audio formats
export type AudioFormat = 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac';

// File metadata
export interface FileMetadata {
	name: string;
	size: number;
	type: FileType;
	format?: string;
	mimeType: string;
	lastModified?: number;
	path?: string;
	url?: string;
}

// Attachment with enhanced metadata
export interface Attachment extends FileMetadata {
	id: string;
	thumbnail?: string;
	duration?: number; // For video/audio files
	dimensions?: {
		width: number;
		height: number;
	}; // For images/videos
	uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
	uploadProgress?: number; // 0-100
	error?: string;
	createdAt: string;
	updatedAt?: string;
}

// =============================================================================
// HISTORY & TIMELINE TYPES
// =============================================================================

// Action types for history tracking
export type HistoryActionType =
	| 'create'
	| 'update'
	| 'delete'
	| 'move'
	| 'status_change'
	| 'add_attachment'
	| 'remove_attachment'
	| 'add_reason'
	| 'profile_switch';

// History entry (enhanced beyond API version)
export interface HistoryEntry {
	id: string;
	profileId: string;
	profileName: string;
	itemId: string;
	itemType: 'flag' | 'dealbreaker' | 'profile';
	itemTitle: string;
	action: HistoryActionType;
	timestamp: string;
	previousValue?: any;
	newValue?: any;
	reason?: string;
	metadata?: Record<string, any>;
	attachments: Attachment[];
	creatorId?: string;
	creatorName?: string;
}

// Timeline grouping
export interface TimelineGroup {
	date: string; // YYYY-MM-DD
	entries: HistoryEntry[];
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

// Search criteria
export interface SearchCriteria {
	query?: string;
	tags?: string[];
	category?: string;
	status?: string[];
	priority?: string[];
	dateRange?: {
		start: string;
		end: string;
	};
	profileIds?: string[];
}

// Sort configuration
export interface SortConfig {
	field: 'title' | 'createdAt' | 'updatedAt' | 'priority' | 'status';
	direction: 'asc' | 'desc';
}

// Filter configuration
export interface FilterConfig {
	search: SearchCriteria;
	sort: SortConfig;
	pagination?: {
		page: number;
		limit: number;
	};
}

// Search result
export interface SearchResult<T> {
	items: T[];
	totalCount: number;
	filteredCount: number;
	hasMore: boolean;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Notification
export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	timestamp: string;
	read?: boolean;
	actionLabel?: string;
	actionCallback?: () => void;
	autoClose?: boolean;
	duration?: number; // milliseconds
}

// Toast notification (simpler version)
export interface ToastNotification {
	type: NotificationType;
	title: string;
	message?: string;
	duration?: number;
}

// =============================================================================
// SETTINGS & CONFIGURATION TYPES
// =============================================================================

// App settings
export interface AppSettings {
	theme: 'light' | 'dark' | 'auto';
	language: string;
	notifications: NotificationSettings;
	sync: SyncSettings;
	display: DisplaySettings;
	privacy: PrivacySettings;
}

// Notification settings
export interface NotificationSettings {
	enabled: boolean;
	pushNotifications: boolean;
	emailNotifications: boolean;
	soundEnabled: boolean;
	vibrationEnabled: boolean;
	quietHours?: {
		enabled: boolean;
		start: string; // HH:MM format
		end: string; // HH:MM format
	};
}

// Sync settings
export interface SyncSettings {
	autoSync: boolean;
	syncInterval: number; // minutes
	wifiOnly: boolean;
	backgroundSync: boolean;
	conflictResolution: 'local' | 'remote' | 'merge' | 'ask';
}

// Display settings
export interface DisplaySettings {
	fontSize: 'small' | 'medium' | 'large';
	compactMode: boolean;
	showThumbnails: boolean;
	animationsEnabled: boolean;
	reducedMotion: boolean;
}

// Privacy settings
export interface PrivacySettings {
	analyticsEnabled: boolean;
	crashReportingEnabled: boolean;
	dataCollection: boolean;
	shareUsageData: boolean;
}

// =============================================================================
// STATISTICS & ANALYTICS TYPES
// =============================================================================

// Usage statistics
export interface UsageStats {
	totalFlags: number;
	totalDealbreakers: number;
	totalProfiles: number;
	totalHistoryEntries: number;
	averageItemsPerProfile: number;
	mostActiveProfile: string;
	recentActivityCount: number;
	lastSyncTime?: string;
}

// Activity summary
export interface ActivitySummary {
	period: 'day' | 'week' | 'month' | 'year';
	startDate: string;
	endDate: string;
	flagsCreated: number;
	dealbreakerssCreated: number;
	statusChanges: number;
	attachmentsAdded: number;
	profileSwitches: number;
}

// =============================================================================
// IMPORT/EXPORT TYPES
// =============================================================================

// Export format
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'html';

// Export configuration
export interface ExportConfig {
	format: ExportFormat;
	includeHistory: boolean;
	includeAttachments: boolean;
	dateRange?: {
		start: string;
		end: string;
	};
	profileIds?: string[];
}

// Import result
export interface ImportResult {
	success: boolean;
	totalItems: number;
	importedItems: number;
	skippedItems: number;
	errors: string[];
	warnings: string[];
}

// =============================================================================
// FEATURE FLAGS & EXPERIMENTAL TYPES
// =============================================================================

// Feature flag
export interface FeatureFlag {
	name: string;
	enabled: boolean;
	description?: string;
	rolloutPercentage?: number; // 0-100
	conditions?: Record<string, any>;
}

// Experimental features
export interface ExperimentalFeatures {
	flags: Record<string, FeatureFlag>;
	userGroups: string[];
	abTests: Record<
		string,
		{
			variant: string;
			enabled: boolean;
		}
	>;
}

// =============================================================================
// UTILITY DATA TYPES
// =============================================================================

// Generic key-value pair
export interface KeyValuePair<T = any> {
	key: string;
	value: T;
}

// Option for dropdowns/selects
export interface SelectOption<T = string> {
	label: string;
	value: T;
	disabled?: boolean;
	icon?: string;
	description?: string;
}

// Coordinate for drag & drop or positioning
export interface Coordinate {
	x: number;
	y: number;
}

// Dimensions
export interface Dimensions {
	width: number;
	height: number;
}

// Rectangle (position + dimensions)
export interface Rectangle extends Coordinate, Dimensions {}

// Color value (hex, rgb, rgba, hsl, etc.)
export type ColorValue = string;

// =============================================================================
// STATE MACHINE TYPES (for complex workflows)
// =============================================================================

// State machine state
export interface StateMachineState<T = any> {
	value: string;
	context: T;
	changed?: boolean;
	done?: boolean;
}

// State machine event
export interface StateMachineEvent {
	type: string;
	payload?: any;
}

// State transition
export interface StateTransition<T> {
	from: string;
	to: string;
	event: string;
	guard?: (context: T, event: StateMachineEvent) => boolean;
	action?: (context: T, event: StateMachineEvent) => T;
}
