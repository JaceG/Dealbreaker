import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
	Attachment,
	HistoryEntry,
	UserData,
	ApiError,
	CustomApiError,
} from '../../models/apiModels';

// API base URL - updated with Render URL
// For local testing on iOS simulator, use http://localhost:4000
// For local testing on Android emulator, use http://10.0.2.2:4000
// For production, use your Render URL
const API_URL = Platform.select({
	ios: __DEV__
		? 'http://localhost:4000/api'
		: 'https://dealbreaker-api.onrender.com/api',
	android: __DEV__
		? 'http://10.0.2.2:4000/api'
		: 'https://dealbreaker-api.onrender.com/api',
	default: 'https://dealbreaker-api.onrender.com/api',
});

// Create axios instance
const api = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000, // 10 seconds
});

// Get flag history from API
export const getFlagHistory = async (
	profileId: string | number,
	flagId: string | number
): Promise<HistoryEntry[]> => {
	try {
		console.log(
			`Fetching flag history for profile ${profileId}, flag ${flagId}`
		);
		const response = await api.get(`/flagHistory/${profileId}/${flagId}`);
		console.log(
			'Raw history data from API:',
			JSON.stringify(response.data).substring(0, 200) + '...'
		);

		// Map the data to ensure all items have proper timestamps and attachments array
		const processedData = response.data.map((item: any) => {
			// Process attachments if they exist
			let processedAttachments: Attachment[] = [];
			if (item.attachments && Array.isArray(item.attachments)) {
				processedAttachments = item.attachments
					.map((attachment: any) => {
						// Validate attachment structure
						if (!attachment) return null;

						// Ensure attachment has necessary properties
						const originalUrl = attachment.url || null;

						// Fix URLs if needed - handle different URL formats
						let fixedUrl = originalUrl;

						if (originalUrl) {
							// Check if the URL is already a proper URL or a file path
							if (
								!originalUrl.startsWith('http') &&
								!originalUrl.startsWith('file') &&
								!originalUrl.startsWith('data:')
							) {
								// For file paths that might be from MongoDB/backend
								if (originalUrl.startsWith('/')) {
									// If it's a server path, construct a proper URL using the API base URL
									const baseApiUrl = API_URL.split('/api')[0]; // Get the base URL without the /api path
									fixedUrl = `${baseApiUrl}${originalUrl}`;
									console.log(
										`Fixed URL: ${originalUrl} → ${fixedUrl}`
									);
								} else if (
									originalUrl.includes('Library/') ||
									originalUrl.includes('Documents/')
								) {
									// Local file system URL, should be prefixed with file://
									fixedUrl = `file://${originalUrl}`;
									console.log(
										`Fixed file URL: ${originalUrl} → ${fixedUrl}`
									);
								}
							}
						}

						return {
							type: attachment.type || 'unknown',
							url: fixedUrl,
							originalUrl: originalUrl, // Keep the original for debugging
							name: attachment.name || `attachment-${Date.now()}`,
							timestamp:
								attachment.timestamp ||
								new Date().toISOString(),
						};
					})
					.filter((att: any) => att !== null && att.url); // Remove nulls and attachments without URLs
			}

			return {
				...item,
				// Ensure timestamp is properly formatted for display
				timestamp: item.timestamp
					? new Date(item.timestamp).toISOString()
					: new Date().toISOString(),
				// Use processed attachments
				attachments: processedAttachments,
			};
		});

		console.log(
			'History fetched successfully:',
			processedData.length,
			'items'
		);

		// Log attachment counts
		processedData.forEach((item: any, i: number) => {
			if (item.attachments && item.attachments.length > 0) {
				console.log(
					`History item ${i} has ${item.attachments.length} attachments:`,
					JSON.stringify(
						item.attachments.map((a: any) => ({
							type: a.type,
							url: a.url
								? a.url.substring(0, 30) + '...'
								: 'Missing URL',
						}))
					)
				);
			}
		});

		// Cache the result locally
		await AsyncStorage.setItem(
			`flagHistory_${profileId}_${flagId}`,
			JSON.stringify(processedData)
		);

		return processedData;
	} catch (error) {
		console.error('Error fetching flag history from API:', error);

		// Fall back to local storage
		return await getFlagHistoryLocal(profileId, flagId);
	}
};

// Add flag history entry to API
export const addFlagHistory = async (
	profileId: string | number,
	flagId: string | number,
	flagTitle: string,
	previousStatus: string,
	newStatus: string,
	reason: string = '',
	profileName: string = 'Unknown Profile',
	creatorId: string | number | null = null,
	cardTypeChange: string = 'none',
	previousCardType: string = 'none',
	newCardType: string = 'none',
	attachments: Attachment[] = []
): Promise<HistoryEntry | null> => {
	try {
		// Create the history entry object
		const historyEntry = {
			profileId,
			profileName,
			flagId,
			flagTitle: String(flagTitle),
			timestamp: new Date(),
			previousStatus,
			newStatus,
			reason,
			creatorId,
			cardTypeChange,
			previousCardType,
			newCardType,
			attachments,
		};

		console.log(
			'Sending flag history entry to API:',
			JSON.stringify(historyEntry, null, 2)
		);

		// Send to API
		const response = await api.post('/flagHistory', historyEntry);
		console.log('Flag history added successfully:', response.data);

		// Also update local cache
		const existingHistory = await getFlagHistoryLocal(profileId, flagId);
		const updatedHistory = [...existingHistory, response.data];
		await AsyncStorage.setItem(
			`flagHistory_${profileId}_${flagId}`,
			JSON.stringify(updatedHistory)
		);

		return response.data;
	} catch (error) {
		console.error('Error adding flag history to API:', error);
		const apiError = error as CustomApiError;
		if (apiError.response) {
			console.error('Server response:', apiError.response.data);
			console.error('Status code:', apiError.response.status);
		} else if (apiError.request) {
			console.error('No response received from server');
		}

		// Store locally and queue for later sync
		try {
			const offlineEntry = {
				_id: `local_${Date.now()}_${Math.random()
					.toString(36)
					.substring(2, 9)}`,
				profileId,
				profileName,
				flagId,
				flagTitle: String(flagTitle),
				timestamp: new Date(),
				previousStatus,
				newStatus,
				reason,
				creatorId,
				cardTypeChange,
				previousCardType,
				newCardType,
				attachments: [],
			};

			// Store locally
			const existingHistory = await getFlagHistoryLocal(
				profileId,
				flagId
			);
			const updatedHistory = [...existingHistory, offlineEntry];
			await AsyncStorage.setItem(
				`flagHistory_${profileId}_${flagId}`,
				JSON.stringify(updatedHistory)
			);

			// Queue for sync
			await storePendingChange('addFlagHistory', offlineEntry);

			console.log('Flag history stored locally for later sync');
			return offlineEntry;
		} catch (storageError) {
			console.error(
				'Failed to store history entry locally:',
				storageError
			);
			return null;
		}
	}
};

// Local storage functions
export const getFlagHistoryLocal = async (
	profileId: string | number,
	flagId: string | number
): Promise<HistoryEntry[]> => {
	try {
		const history = await AsyncStorage.getItem(
			`flagHistory_${profileId}_${flagId}`
		);
		const parsedHistory = history ? JSON.parse(history) : [];

		// Sort by timestamp (newest first)
		return parsedHistory.sort((a: any, b: any) => {
			return (
				new Date(b.timestamp).getTime() -
				new Date(a.timestamp).getTime()
			);
		});
	} catch (error) {
		console.error('Error fetching local flag history:', error);
		return [];
	}
};

// Store pending change
export const storePendingChange = async (
	action: string,
	data: any
): Promise<void> => {
	try {
		const pendingChanges = await AsyncStorage.getItem('pendingChanges');
		const changes = pendingChanges ? JSON.parse(pendingChanges) : [];

		changes.push({
			action,
			data,
			timestamp: new Date(),
		});

		await AsyncStorage.setItem('pendingChanges', JSON.stringify(changes));
	} catch (error) {
		console.error('Error storing pending change:', error);
	}
};

// Sync pending changes
export const syncPendingChanges = async () => {
	try {
		// Check for offline mode
		const isOfflineMode = await AsyncStorage.getItem('offlineMode');
		if (isOfflineMode === 'true') {
			// Don't attempt to sync in offline mode
			return {
				success: true,
				message: 'App is in offline mode, sync skipped.',
			};
		}

		// Get pending changes from storage
		const pendingChanges = await AsyncStorage.getItem('pendingChanges');

		if (!pendingChanges) {
			// No changes to sync - this is a success case
			return { success: true, message: 'No changes to sync' };
		}

		const changes = JSON.parse(pendingChanges);
		if (changes.length === 0) {
			// Empty array of changes - this is a success case
			return { success: true, message: 'No changes to sync' };
		}

		// In offline-only dev mode, just pretend the sync worked
		if (__DEV__ && process.env.OFFLINE_ONLY === 'true') {
			console.log('DEV MODE: Simulating successful sync');
			return { success: true, message: 'Simulated sync in dev mode' };
		}

		try {
			// Try to send to API with timeout
			const response = await api.post('/flagHistory/sync', { changes });

			if (response.data.success) {
				// Sync successful, clear pending changes
				await AsyncStorage.setItem(
					'pendingChanges',
					JSON.stringify([])
				);
				return {
					success: true,
					message: 'Changes synced successfully',
				};
			} else {
				// API returned an error
				return {
					success: false,
					message:
						response.data.message || 'Server returned an error',
				};
			}
		} catch (apiError) {
			// API request failed - store as offline for now
			const error = apiError as ApiError;
			console.error('API sync error:', error.message);

			// Don't treat this as a critical error in the UI - just store for later sync
			return {
				success: true,
				offline: true,
				message: 'Changes stored for later sync',
			};
		}
	} catch (error) {
		console.error('Error in sync process:', error);
		return { success: false, message: 'Error processing pending changes' };
	}
};

// Add attachment to history entry
export const addAttachmentToHistory = async (
	historyId: string | number,
	attachment: Attachment
): Promise<any> => {
	try {
		console.log(
			`Adding attachment to history entry ${historyId}`,
			attachment
		);

		if (!historyId) {
			console.error('Cannot add attachment: Missing history ID');
			return { success: false, error: 'Missing history ID' };
		}

		// If the attachment already has an S3 URL (isS3: true), just use it directly
		if (attachment.isS3) {
			console.log(
				'Attachment already has S3 URL, adding directly',
				attachment
			);

			// Prepare attachment data
			const requestData = {
				attachment,
			};

			// Send to API
			try {
				const response = await api.post(
					`/flagHistory/${historyId}/attachment`,
					requestData
				);
				console.log('Attachment added successfully:', response.data);
				return response.data;
			} catch (apiError) {
				// Handle 404 error - history ID might not exist
				const error = apiError as CustomApiError;
				if (error.response && error.response.status === 404) {
					console.log(
						'History entry not found, storing attachment locally'
					);
					// Store attachment locally for future sync
					await storePendingChange('addAttachment', {
						historyId,
						attachment,
					});
					return { success: true, localOnly: true };
				}
				throw apiError;
			}
		} else {
			console.log('Attachment needs S3 upload first');
			// In a real implementation, this would upload to S3 first
			// For now, just return failure
			return {
				success: false,
				error: 'Attachment must be uploaded to S3 first',
			};
		}
	} catch (error) {
		console.error('Error adding attachment to MongoDB:', error);
		const apiError = error as CustomApiError;
		if (apiError.response) {
			console.error('Server response:', apiError.response.data);
			console.error('Status code:', apiError.response.status);
		} else if (apiError.request) {
			console.error('No response received from server');
		}
		return { success: false, error: apiError.message || 'Unknown error' };
	}
};

// Fetch all user data including profiles and flags
export const fetchAllUserData = async (
	userId: string | number
): Promise<UserData> => {
	try {
		console.log(`Fetching all data for user ${userId}`);
		const response = await api.get(`/user/data/${userId}`);
		console.log(
			'User data fetched successfully:',
			`${response.data.profiles?.length || 0} profiles, ` +
				`${Object.keys(response.data.flags || {}).length} flag records`
		);
		return response.data;
	} catch (error) {
		console.error('Error fetching user data:', error);
		const apiError = error as CustomApiError;
		if (apiError.response) {
			console.error('Server response:', apiError.response.data);
			console.error('Status code:', apiError.response.status);
		} else if (apiError.request) {
			console.error('No response received from server');
		}
		throw error;
	}
};
