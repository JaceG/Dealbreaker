import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	Attachment,
	HistoryEntry,
	ApiError,
	CustomApiError,
	SignInMethods,
	SignInType,
} from '../../models/apiModels';
import { getSecureItem } from '../storage';

const API_URL = 'https://dealbreaker-api.onrender.com/api';

// Create axios instance
const api = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000, // 10 seconds
});

// Flag-history routes need the login token; a header a caller passes itself still wins.
api.interceptors.request.use(async (config) => {
	const token = await getSecureItem('authToken');
	if (token && !config.headers['x-auth-token']) {
		config.headers['x-auth-token'] = token;
	}
	return config;
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
							duration: attachment.duration,
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
			'SSending flag history entry to API:',
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
				attachments,
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

// How many history entries each card has on one profile: { [flagId]: count }. null when the server can't be reached.
export const getHistoryCounts = async (
	profileId: string
): Promise<Record<string, number> | null> => {
	try {
		const response = await api.get(`/flagHistory/counts/${profileId}`);
		return response.data || {};
	} catch (error) {
		return null;
	}
};

const deleteProfileHistoryNow = (profileId: string) =>
	api.delete(`/flagHistory/profile/${encodeURIComponent(profileId)}`);

// Removes a deleted profile's history from the server. One try now; if it fails it is queued, so the next sync retries it even after a restart.
export const deleteProfileHistory = async (profileId: string): Promise<boolean> => {
	try {
		await deleteProfileHistoryNow(profileId);
		return true;
	} catch (error) {
		console.error('Error deleting profile history, queued for the next sync:', error);
		await storePendingChange('deleteProfileHistory', { profileId });
		return false;
	}
};

export const saveMyAccount = async (
	type: number,
	name: string,
	oldPassword: string,
	password: string,
	token: string
): Promise<any> => {
	try {
		const header = {
			'Content-Type': 'application/json',
			'x-auth-token': `${token}`,
		};
		console.log('header: ', header);
		// Send to API
		const response = await api.post(
			'/myAccount',
			{
				type,
				name,
				oldPassword,
				newPassword: password,
			},
			{ headers: header }
		);

		return response.data;
	} catch (error) {
		console.error('Error adding my account to API:', error);
		const apiError = error as CustomApiError;
		if (apiError.response) {
			console.error('Server response:', apiError.response.data);
			console.error('Status code:', apiError.response.status);
		} else if (apiError.request) {
			console.error('No response received from server');
		}
	}
};

const authHeader = (token: string) => ({
	headers: { 'x-auth-token': token },
});

// Returns null when the sign-in methods could not be loaded.
export const getSignInMethods = async (
	token: string
): Promise<SignInMethods | null> => {
	try {
		return (await api.get('/myAccount/signInMethods', authHeader(token)))
			.data;
	} catch (error) {
		console.error('Error loading sign-in methods:', error);
		return null;
	}
};

// Throws with the server's reason when it refuses, such as an account that belongs to someone else.
export const changeSignInMethod = async (
	action: 'connect' | 'disconnect',
	type: SignInType,
	token: string,
	idToken?: string
): Promise<SignInMethods> => {
	try {
		return (
			await api.post(
				`/myAccount/${action}`,
				{ type, idToken },
				authHeader(token)
			)
		).data;
	} catch (error) {
		const message = (error as CustomApiError).response?.data?.errors?.[0]
			?.msg;
		throw new Error(message || 'Something went wrong. Please try again.');
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

// Race: storePendingChange and syncPendingChanges both read, change and write pendingChanges; interleaved, the later write drops the other's entry.
let pendingLock: Promise<unknown> = Promise.resolve();
function withPendingLock<T>(fn: () => Promise<T>): Promise<T> {
	const run = pendingLock.then(fn, fn);
	pendingLock = run.catch(() => {});
	return run;
}
const readPending = async (): Promise<any[]> =>
	JSON.parse((await AsyncStorage.getItem('pendingChanges')) || '[]');
const newPendingId = () =>
	`${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
// Each queued change belongs to the account that made it, so it is only ever sent with that account's login.
const currentUserId = async (): Promise<string | null> => {
	try {
		return JSON.parse((await getSecureItem('userData')) || 'null')?.id || null;
	} catch {
		return null;
	}
};

// Account deletion: this account's queued changes must not be sent afterwards. Waits out a sync already
// running (it may have read them) before dropping.
export const dropPendingChangesFor = async (userId: string) => {
	await syncInFlight?.catch(() => {});
	return withPendingLock(async () => {
		const list = await readPending();
		await AsyncStorage.setItem(
			'pendingChanges',
			JSON.stringify(list.filter((c) => c.owner && c.owner !== userId))
		);
	});
};

// Store pending change
export const storePendingChange = async (
	action: string,
	data: any
): Promise<void> => {
	try {
		const owner = await currentUserId();
		// Signed out (e.g. mid-logout): no account to send it under later, so it isn't queued.
		if (!owner) return;
		await withPendingLock(async () => {
			const changes = await readPending();
			changes.push({ id: newPendingId(), owner, action, data, timestamp: new Date() });
			await AsyncStorage.setItem('pendingChanges', JSON.stringify(changes));
		});
	} catch (error) {
		console.error('Error storing pending change:', error);
	}
};

// One sync at a time: a second caller (logout during a reconnect sync) waits for the running one instead of
// reading the same entries and posting them again.
let syncInFlight: Promise<{ success: boolean; offline?: boolean; message: string }> | null = null;
export const syncPendingChanges = () => {
	if (!syncInFlight) {
		syncInFlight = runPendingSync().finally(() => {
			syncInFlight = null;
		});
	}
	return syncInFlight;
};

const runPendingSync = async (): Promise<{ success: boolean; offline?: boolean; message: string }> => {
	try {
		// Check for offline mode
		const isOfflineMode = await AsyncStorage.getItem('offlineMode');
		if (isOfflineMode === 'true') {
			// Don't attempt to sync in offline mode
			// offline: true keeps the queue; without it the caller clears the unsent entries.
			return {
				success: true,
				offline: true,
				message: 'App is in offline mode, sync skipped.',
			};
		}

		// Get pending changes; entries queued before ids existed get one, so only what was sent is removed below.
		// Only entries from before ids and owners existed (no id) are taken as the signed-in account's;
		// any other entry without an owner is dropped. Another account's entries stay queued.
		const me = await currentUserId();
		if (!me) return { success: true, offline: true, message: 'Not signed in, sync skipped.' };
		const changes = await withPendingLock(async () => {
			const list = await readPending();
			if (list.some((c) => !c.id || !c.owner)) {
				const kept = list
					.filter((c) => c.owner || !c.id)
					.map((c) => (c.owner ? c : { ...c, id: newPendingId(), owner: me }));
				await AsyncStorage.setItem('pendingChanges', JSON.stringify(kept));
				return kept.filter((c) => c.owner === me);
			}
			return list.filter((c) => c.owner === me);
		});
		if (changes.length === 0) {
			// No changes to sync - this is a success case
			return { success: true, message: 'No changes to sync' };
		}

		const sent = new Set<string>();
		const history = changes.filter((c) => c.action !== 'deleteProfileHistory');
		const deletes = changes.filter((c) => c.action === 'deleteProfileHistory');
		let result: { success: boolean; offline?: boolean; message: string } = {
			success: true,
			message: 'Changes synced successfully',
		};

		if (history.length > 0) {
			try {
				// Try to send to API with timeout
				const response = await api.post('/flagHistory/sync', { changes: history });
				if (response.data.success) {
					history.forEach((c) => sent.add(c.id));
				} else {
					// API returned an error
					result = {
						success: false,
						message: response.data.message || 'Server returned an error',
					};
				}
			} catch (apiError) {
				// API request failed - store as offline for now
				const error = apiError as ApiError;
				console.error('API sync error:', error.message);
				// Don't treat this as a critical error in the UI - just store for later sync
				result = {
					success: true,
					offline: true,
					message: 'Changes stored for later sync',
				};
			}
		}

		// Deletes go after the history they may cover, so a queued note can't bring a deleted profile's history back.
		if (sent.size === history.length) {
			for (const change of deletes) {
				try {
					await deleteProfileHistoryNow(change.data.profileId);
					sent.add(change.id);
				} catch (error) {
					console.error('Error deleting profile history on sync:', error);
					result = { ...result, offline: true };
				}
			}
		}

		// Drop exactly what was sent; entries queued during the requests stay for next time.
		if (sent.size > 0) {
			await withPendingLock(async () => {
				const latest = await readPending();
				await AsyncStorage.setItem(
					'pendingChanges',
					JSON.stringify(latest.filter((c) => !sent.has(c.id)))
				);
			});
		}
		return result;
	} catch (error) {
		console.error('Error in sync process:', error);
		return { success: false, message: 'Error processing pending changes' };
	}
};

// One card's history across every person (Main left out), newest first. Throws when the server can't be reached.
export const getCardHistoryAcrossProfiles = async (
	flagId: string | number
): Promise<HistoryEntry[]> =>
	(await api.get(`/flagHistory/card/${encodeURIComponent(String(flagId))}`)).data || [];

// All of your history entries, every profile, oldest first, without attachments (for the Stats screen). Throws on failure.
export const getMyHistory = async (): Promise<import('../stats').HistoryRow[]> => {
	const response = await api.get('/flagHistory/mine');
	return response.data || [];
};
