// Board and drag-gesture diagnostics: on for developer accounts, and for any account while support has
// diagnostics switched on (see context/Auth). Off for everyone else.
// Every event is kept in memory for the Settings > Board Log screen and uploaded in batches to the
// backend (/api/boardLog), so a test on the phone can be read without the phone. Batches that
// can't be sent yet are saved to storage when the app goes to the background and sent next launch.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Dimensions, PixelRatio, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { postBoardLog } from './api';
import { getSecureItem } from './storage';

// Turned on by context/Auth for the signed-in account's `developer` flag or an active `diagnosticsUntil`
// (both set only on the server, by scripts/set-developer.js and scripts/set-diagnostics.js). Everyone else's
// boards are never recorded or uploaded, and the server refuses uploads from accounts without either.
let enabled = false;

export const setBoardLogEnabled = (value: boolean) => {
	enabled = value;
};

export const isBoardLogEnabled = () => enabled;

export type BoardLogEvent = { t: number; n: number; type: string; [key: string]: unknown };

const KEEP = 3000; // events kept in memory for the viewer and for upload
const BATCH = 400;
const UPLOAD_EVERY_MS = 3000;
const STORE_PREFIX = 'boardLogUnsent:';
const KEEP_SAVED_SESSIONS = 5;

const newSession = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
let session = newSession();
let seq = 0;
const recent: BoardLogEvent[] = [];
let unsent: BoardLogEvent[] = [];
let uploading = false;
let started = false;
let needHeader = true;
// Bumped by resetBoardLog, so work already in flight for the previous account stops.
let generation = 0;
let lastUpload: { at: number; ok: boolean; error?: string } | null = null;
let saved = false;
const listeners = new Set<() => void>();

const trim = (list: BoardLogEvent[]) => {
	if (list.length > KEEP) list.splice(0, list.length - KEEP);
};

export const boardLog = (type: string, data: Record<string, unknown> = {}) => {
	if (!enabled) return;
	start();
	if (needHeader) {
		needHeader = false;
		pushHeader();
	}
	const event: BoardLogEvent = { t: Date.now(), n: seq++, type, ...data };
	recent.push(event);
	unsent.push(event);
	trim(recent);
	trim(unsent);
	listeners.forEach((l) => l());
};

export const boardLogStatus = () => ({
	session,
	count: recent.length,
	unsent: unsent.length,
	lastUpload,
});

export const boardLogEvents = () => recent.slice();

export const onBoardLogChange = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const formatBoardLogEvent = (e: BoardLogEvent) => {
	const { t, n, type, ...rest } = e;
	const time = new Date(t).toISOString().slice(11, 23);
	return `${time} #${n} ${type} ${JSON.stringify(rest)}`;
};

export const uploadBoardLog = async () => {
	if (!enabled || uploading || unsent.length === 0) return;
	uploading = true;
	// Signed out: keep the events and don't knock on the server every few seconds.
	if (!(await getSecureItem('authToken'))) {
		uploading = false;
		return;
	}
	const batch = unsent.slice(0, BATCH);
	try {
		await postBoardLog(session, batch);
		const sent = new Set(batch.map((e) => e.n));
		unsent = unsent.filter((e) => !sent.has(e.n));
		lastUpload = { at: Date.now(), ok: true };
		// Keep the stored copy in step, so a later launch doesn't send these again.
		if (saved) saveUnsent();
	} catch (error: any) {
		// Not signed in yet, offline, or the server is waking up: keep the batch for the next try.
		lastUpload = {
			at: Date.now(),
			ok: false,
			error: error?.response?.status ? `HTTP ${error.response.status}` : error?.message || 'failed',
		};
	} finally {
		uploading = false;
		listeners.forEach((l) => l());
	}
};

// Events from earlier launches that never reached the server, sent under their own session ids.
const sendSaved = async () => {
	try {
		// Session ids start with the launch time, so sorting keeps the newest; older ones are dropped.
		const all = (await AsyncStorage.getAllKeys())
			.filter((k) => k.startsWith(STORE_PREFIX) && k !== STORE_PREFIX + session)
			.sort();
		const keys = all.slice(-KEEP_SAVED_SESSIONS);
		const dropped = all.slice(0, -KEEP_SAVED_SESSIONS);
		if (dropped.length) await AsyncStorage.multiRemove(dropped);
		const gen = generation;
		for (const key of keys) {
			const events = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
			const oldSession = key.slice(STORE_PREFIX.length);
			for (let i = 0; i < events.length; i += BATCH) {
				// Signed out or another account since this started: stop, and let the reset clear storage.
				if (!enabled || gen !== generation) return;
				await postBoardLog(oldSession, events.slice(i, i + BATCH));
			}
			await AsyncStorage.removeItem(key);
		}
	} catch {
		// Leave them saved; the next launch tries again.
	}
};

// Signing out or switching accounts: forget everything recorded, in memory and in storage, so one person's
// events can never be shown to or uploaded under another account.
export const resetBoardLog = async () => {
	generation++;
	recent.length = 0;
	unsent = [];
	saved = false;
	lastUpload = null;
	needHeader = true;
	session = newSession();
	listeners.forEach((l) => l());
	try {
		const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(STORE_PREFIX));
		if (keys.length) await AsyncStorage.multiRemove(keys);
	} catch {
		// Nothing to clean, or storage unavailable.
	}
};

const saveUnsent = () => {
	if (!enabled) return;
	saved = true;
	const key = STORE_PREFIX + session;
	(unsent.length
		? AsyncStorage.setItem(key, JSON.stringify(unsent))
		: AsyncStorage.removeItem(key)
	).catch(() => {});
};

function pushHeader() {
	const { width, height } = Dimensions.get('window');
	const header: BoardLogEvent = {
		t: Date.now(),
		n: seq++,
		type: 'session.start',
		platform: Platform.OS,
		os: Platform.Version,
		window: { width, height },
		pixelRatio: PixelRatio.get(),
		appVersion: Constants.expoConfig?.version,
		runtimeVersion: Updates.runtimeVersion,
		updateId: Updates.updateId,
		channel: Updates.channel,
		embeddedLaunch: Updates.isEmbeddedLaunch,
	};
	recent.push(header);
	unsent.push(header);
}

function start() {
	if (started) return;
	started = true;
	setInterval(uploadBoardLog, UPLOAD_EVERY_MS);
	sendSaved();
	AppState.addEventListener('change', (state) => {
		boardLog('app.state', { state });
		if (state === 'background' || state === 'inactive') {
			uploadBoardLog();
			saveUnsent();
		}
	});
}
