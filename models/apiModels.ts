// =============================================================================
// API CONFIGURATION TYPES
// =============================================================================

export interface ApiConfig {
	baseURL: string;
	timeout: number;
	headers: Record<string, string>;
}

export interface PlatformApiUrls {
	ios: string;
	android: string;
	default: string;
}

// =============================================================================
// GENERIC API PATTERNS
// =============================================================================

// Base API response structure
export interface BaseApiResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
	errors?: Array<{ msg: string; field?: string }>;
}

// API error response
export interface ApiErrorResponse {
	success: false;
	message: string;
	error?: string;
	errors?: Array<{ msg: string; field?: string }>;
	statusCode?: number;
}

// Paginated response
export interface PaginatedApiResponse<T> extends BaseApiResponse<T[]> {
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		itemsPerPage: number;
	};
}

// =============================================================================
// FLAG HISTORY API TYPES
// =============================================================================

// Flag history entry (as returned from API)
export interface FlagHistoryEntry {
	_id?: string; // MongoDB ID
	id?: string; // Normalized ID
	profileId: string;
	profileName: string;
	flagId: string;
	flagTitle: string;
	timestamp: string; // ISO string
	previousStatus: string;
	newStatus: string;
	reason?: string;
	creatorId?: string;
	cardTypeChange?: 'none' | 'flag-to-dealbreaker' | 'dealbreaker-to-flag';
	previousCardType?: 'flag' | 'dealbreaker' | 'none';
	newCardType?: 'flag' | 'dealbreaker' | 'none';
	attachments: FlagHistoryAttachment[];
}

// Attachment structure for flag history
export interface FlagHistoryAttachment {
	id?: string;
	type: 'image' | 'video' | 'audio' | 'document' | 'unknown';
	url: string;
	originalUrl?: string; // For debugging/fallback
	name: string;
	size?: number;
	mimeType?: string;
	timestamp: string;
	isS3?: boolean; // Whether the file is stored in S3
}

// Request to add flag history
export interface AddFlagHistoryRequest {
	profileId: string;
	profileName: string;
	flagId: string;
	flagTitle: string;
	previousStatus: string;
	newStatus: string;
	reason?: string;
	creatorId?: string;
	cardTypeChange?: string;
	previousCardType?: string;
	newCardType?: string;
	attachments?: FlagHistoryAttachment[];
}

// Response from adding flag history
export interface AddFlagHistoryResponse
	extends BaseApiResponse<FlagHistoryEntry> {}

// Request to get flag history
export interface GetFlagHistoryRequest {
	profileId: string;
	flagId: string;
}

// Response from getting flag history
export interface GetFlagHistoryResponse
	extends BaseApiResponse<FlagHistoryEntry[]> {}

// =============================================================================
// USER DATA API TYPES
// =============================================================================

// User data from API (extends the auth UserData)
export interface ApiUserData {
	_id: string; // MongoDB ID
	id: string; // Normalized ID
	name: string;
	email: string;
	createdAt?: string;
	updatedAt?: string;
	[key: string]: any; // Additional fields
}

// User profiles and flags data
export interface UserDataResponse {
	profiles: UserProfile[];
	flags: UserFlagsData;
}

// Profile as returned from API
export interface UserProfile {
	id: string;
	name: string;
	createdAt?: string;
	updatedAt?: string;
}

// User flags data structure
export interface UserFlagsData {
	[profileId: string]: {
		flag: FlagItem[];
		dealbreaker: FlagItem[];
	};
}

// Request to fetch all user data
export interface FetchUserDataRequest {
	userId: string;
}

// Response from fetching user data
export interface FetchUserDataResponse
	extends BaseApiResponse<UserDataResponse> {}

// =============================================================================
// SYNC API TYPES
// =============================================================================

// Pending change structure
export interface PendingChange {
	action: string;
	data: any;
	timestamp: string;
}

// Sync request
export interface SyncRequest {
	changes: PendingChange[];
}

// Sync response
export interface SyncResponse
	extends BaseApiResponse<{
		syncedCount: number;
		failedCount: number;
		errors?: string[];
	}> {
	offline?: boolean; // Indicates if the operation was stored for later sync
}

// =============================================================================
// ATTACHMENT API TYPES
// =============================================================================

// Request to add attachment to history
export interface AddAttachmentRequest {
	historyId: string;
	attachment: FlagHistoryAttachment;
}

// Response from adding attachment
export interface AddAttachmentResponse
	extends BaseApiResponse<{
		historyId: string;
		attachment: FlagHistoryAttachment;
	}> {
	localOnly?: boolean; // Indicates if stored locally only
}

// =============================================================================
// DEALBREAKER API TYPES
// =============================================================================

// Flag item (for API operations)
export interface FlagItem {
	id: string;
	title?: string;
	description?: string;
	color?: string;
	status?: string;
	createdAt?: string;
	updatedAt?: string;
	[key: string]: any; // Additional properties
}

// Dealbreaker data structure
export interface DealbreakerApiData {
	[profileId: string]: {
		flag: FlagItem[];
		dealbreaker: FlagItem[];
	};
}

// Request to add/update dealbreakers
export interface AddDealbreakersRequest {
	dealbreaker: DealbreakerApiData;
	userId: string;
}

// Response from adding dealbreakers
export interface AddDealbreakersResponse
	extends BaseApiResponse<{
		profilesUpdated: number;
		flagsUpdated: number;
		dealbreakerssUpdated: number;
	}> {}

// Request to get dealbreakers
export interface GetDealbreakersRequest {
	userId: string;
}

// Response from getting dealbreakers
export interface GetDealbreakersResponse
	extends BaseApiResponse<DealbreakerApiData> {}

// =============================================================================
// API ERROR TYPES
// =============================================================================

// Network error
export interface NetworkError {
	type: 'network';
	message: string;
	code?: string;
}

// Server error
export interface ServerError {
	type: 'server';
	message: string;
	statusCode: number;
	data?: any;
}

// Validation error
export interface ValidationError {
	type: 'validation';
	message: string;
	fields: Array<{
		field: string;
		message: string;
	}>;
}

// Authentication error
export interface AuthError {
	type: 'auth';
	message: string;
	code?: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'MISSING_TOKEN';
}

// Union type for all API errors
export type ApiError =
	| NetworkError
	| ServerError
	| ValidationError
	| AuthError
	| CustomApiError;

// =============================================================================
// API ENDPOINT TYPES
// =============================================================================

// API endpoints enum/constants
export const API_ENDPOINTS = {
	// Authentication
	LOGIN: '/auth/login',
	REGISTER: '/auth/register',
	USER: '/auth/user',

	// Flag History
	FLAG_HISTORY: '/flagHistory',
	FLAG_HISTORY_BY_ID: (profileId: string, flagId: string) =>
		`/flagHistory/${profileId}/${flagId}`,
	FLAG_HISTORY_SYNC: '/flagHistory/sync',
	FLAG_HISTORY_ATTACHMENT: (historyId: string) =>
		`/flagHistory/${historyId}/attachment`,

	// User Data
	USER_DATA: (userId: string) => `/user/data/${userId}`,

	// Dealbreakers
	DEALBREAKERS: '/dealbreaker',
} as const;

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API request configuration
export interface ApiRequestConfig {
	method: HttpMethod;
	endpoint: string;
	data?: any;
	params?: Record<string, any>;
	headers?: Record<string, string>;
	timeout?: number;
}

// =============================================================================
// UTILITY TYPES FOR API OPERATIONS
// =============================================================================

// Result type for API operations (success/error pattern)
export type ApiResult<T> =
	| { success: true; data: T; error?: never }
	| { success: false; error: ApiError; data?: never };

// Async API operation function type
export type ApiOperation<TRequest, TResponse> = (
	request: TRequest
) => Promise<ApiResult<TResponse>>;

// API client interface
export interface ApiClient {
	get<T>(endpoint: string, config?: Partial<ApiRequestConfig>): Promise<T>;
	post<T>(
		endpoint: string,
		data?: any,
		config?: Partial<ApiRequestConfig>
	): Promise<T>;
	put<T>(
		endpoint: string,
		data?: any,
		config?: Partial<ApiRequestConfig>
	): Promise<T>;
	delete<T>(endpoint: string, config?: Partial<ApiRequestConfig>): Promise<T>;
	patch<T>(
		endpoint: string,
		data?: any,
		config?: Partial<ApiRequestConfig>
	): Promise<T>;
}

// =============================================================================
// OFFLINE/CACHE TYPES
// =============================================================================

// Cache entry
export interface CacheEntry<T> {
	data: T;
	timestamp: string;
	expiresAt?: string;
}

// Cache key patterns
export type CacheKey =
	| `flagHistory_${string}_${string}` // profileId_flagId
	| `userData_${string}` // userId
	| `dealbreakers_${string}` // userId
	| 'pendingChanges'
	| 'profiles'
	| 'currentProfileId'
	| 'offlineMode';

// Storage operations interface
export interface StorageAdapter {
	getItem<T>(key: CacheKey): Promise<T | null>;
	setItem<T>(key: CacheKey, value: T): Promise<void>;
	removeItem(key: CacheKey): Promise<void>;
	clear(): Promise<void>;
}

// Type definitions
export interface Attachment {
	type: string;
	url: string;
	originalUrl?: string;
	name: string;
	timestamp: string;
	isS3?: boolean;
}

export interface HistoryEntry {
	_id?: string;
	profileId: string | number;
	profileName: string;
	flagId: string | number;
	flagTitle: string;
	timestamp: string | Date;
	previousStatus: string;
	newStatus: string;
	reason: string;
	creatorId: string | number | null;
	cardTypeChange: string;
	previousCardType: string;
	newCardType: string;
	attachments: Attachment[];
}

export interface CustomApiError extends Error {
	response?: {
		data: any;
		status: number;
	};
	request?: any;
}

export interface UserData {
	profiles?: any[];
	flags?: { [key: string]: any };
}
