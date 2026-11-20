import { useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import StoreContext from '../store';
import { getDealbreakers } from '../utils/mongodbapi';
import { clearKeys, getAtomicValue, getList } from '../utils/storage';
import { showToast } from '../utils/functions';
import { useAuthActions } from './useAuthActions';

export const useDealbreakerSync = (user: any) => {
	const { setDealbreaker, currentProfileId, setCurrentProfileId, boardLoadedRef, boardSyncRef, boardReady, setBoardReady, isOnline } =
		useContext<any>(StoreContext);
	const { logout } = useAuthActions();
	// Read when the board arrives: a profile picked while it loaded wins over the saved one.
	const currentProfileIdRef = useRef(currentProfileId);
	currentProfileIdRef.current = currentProfileId;
	const boardReadyRef = useRef(boardReady);
	boardReadyRef.current = boardReady;
	const isOnlineRef = useRef(isOnline);
	isOnlineRef.current = isOnline;
	const isDealbreakerTimeoutRef = useRef<
		boolean | ReturnType<typeof setTimeout>
	>(false);
	// One retry chain at a time: a new fetch replaces a pending retry instead of starting a second chain.
	const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// The wait gathers quick repeats into one request; the first load after sign-in or launch skips it.
	const fetchDealbreakers = async (delay = 1000) => {
		if (retryRef.current) clearTimeout(retryRef.current);
		retryRef.current = null;
		const userData = await SecureStore.getItem('userData');
		if (userData) {
			if (isDealbreakerTimeoutRef.current) {
				clearTimeout(
					isDealbreakerTimeoutRef.current as ReturnType<
						typeof setTimeout
					>
				);
			}
			isDealbreakerTimeoutRef.current = setTimeout(async () => {
				isDealbreakerTimeoutRef.current = false;
				const userDataObject = JSON.parse(userData);
				const userId = userDataObject.id;
				const savesBefore = boardSyncRef.current.saves;
				const response = await getDealbreakers(userId);
				// Reopen on the profile that was open last, if this board still has it.
				const lastProfileId = await getAtomicValue('currentProfileId');
				// This account's changes the server doesn't have yet that aren't on screen: kept at logout (useAuthActions),
				// or the phone's marked copy still loading at launch (useDataLoader). They win over this answer.
				// Kept at logout only for a day: older, they'd overwrite what was done on another device since.
				const stash = await getList(`unsavedBoard_${userId}`);
				const kept =
					(stash && Date.now() - stash.at < 24 * 60 * 60 * 1000 ? stash.board : null) ||
					(!boardReadyRef.current && (await getAtomicValue('boardUnsaved')) === userId
						? await getList('dealbreaker')
						: null);
				// Signed out, or into another account, while the request was out: this board isn't theirs.
				// Nothing is awaited after this check, so a logout can't slip in before the board is applied.
				const signedIn = await SecureStore.getItem('userData');
				if (!signedIn || JSON.parse(signedIn).id !== userId) return;
				// An expired login never starts working again: sign out instead of retrying forever.
				if (response === 'unauthorized') {
					showToast('error', 'Please sign in again', 'Your login has expired.');
					logout();
					return;
				}
				// undefined = the request failed: until the first answer arrives, try again. A later refresh is just
				// skipped (the next return to the app tries again).
				if (response === undefined) {
					if (!boardLoadedRef.current) retryRef.current = setTimeout(fetchDealbreakers, 15000);
					return;
				}
				const sync = boardSyncRef.current;
				// This phone has changes the server doesn't have yet, or a save is out or went through while this was (so
				// the answer may predate it): the phone's board wins (Jace, 2026-11-18) and app/_layout keeps saving it.
				if (
					sync.unsavedBy === userId ||
					(sync.account === userId && (sync.saving || sync.saves !== savesBefore))
				) {
					boardLoadedRef.current = true;
					return;
				}
				// The phone's copy already opened the last profile; after that, whatever is open stays open.
				const alreadyShown = boardReadyRef.current;
				boardLoadedRef.current = true;
				// null is a new account with no board yet: anything put on the board is then unsaved.
				sync.account = userId;
				sync.serverJson = JSON.stringify(response);
				// Kept changes differ from serverJson, so app/_layout saves them.
				const board = kept || response;
				if (stash) clearKeys([`unsavedBoard_${userId}`]);
				setBoardReady(true);
				if (board) {
					setDealbreaker(board);
					if (
						!alreadyShown &&
						lastProfileId &&
						board[lastProfileId] &&
						currentProfileIdRef.current === 'main'
					) {
						setCurrentProfileId(lastProfileId);
					} else if (!board[currentProfileIdRef.current]) {
						// The phone's copy opened a person this board no longer has (removed on another device).
						setCurrentProfileId('main');
					}
				}
			}, delay);
		}
	};

	// Once per account, not on every change to the user object (launch sets it twice), so the board isn't held back.
	const userId = user?.id || user?._id;
	useEffect(() => {
		if (!userId) return;
		fetchDealbreakers(0);
		// Coming back to the app picks up changes made on another device.
		const subscription = AppState.addEventListener('change', (state) => {
			// Online only, as before (it followed a successful account check): a request started offline would land
			// later over changes made in the meantime.
			if (state === 'active' && isOnlineRef.current) fetchDealbreakers();
		});
		return () => subscription.remove();
	}, [userId]);

	useEffect(
		() => () => {
			if (retryRef.current) clearTimeout(retryRef.current);
			if (isDealbreakerTimeoutRef.current) {
				clearTimeout(isDealbreakerTimeoutRef.current as ReturnType<typeof setTimeout>);
			}
		},
		[]
	);

	return {
		fetchDealbreakers,
	};
};
