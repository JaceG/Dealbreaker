import { useContext, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import StoreContext from '../store';
import { getDealbreakers } from '../utils/mongodbapi';
import { getAtomicValue } from '../utils/storage';
import { showToast } from '../utils/functions';
import { useAuthActions } from './useAuthActions';

export const useDealbreakerSync = (user: any) => {
	const { setDealbreaker, currentProfileId, setCurrentProfileId, boardLoadedRef } =
		useContext<any>(StoreContext);
	const { logout } = useAuthActions();
	// Read when the board arrives: a profile picked while it loaded wins over the saved one.
	const currentProfileIdRef = useRef(currentProfileId);
	currentProfileIdRef.current = currentProfileId;
	const isDealbreakerTimeoutRef = useRef<
		boolean | ReturnType<typeof setTimeout>
	>(false);
	// One retry chain at a time: a new fetch replaces a pending retry instead of starting a second chain.
	const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const fetchDealbreakers = async () => {
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
				const response = await getDealbreakers(userId);
				// An expired login never starts working again: sign out instead of retrying forever.
				if (response === 'unauthorized') {
					showToast('error', 'Please sign in again', 'Your login has expired.');
					logout();
					return;
				}
				// undefined = the request failed (Render may be asleep): keep saving off and try again.
				if (response === undefined) {
					retryRef.current = setTimeout(fetchDealbreakers, 15000);
					return;
				}
				// Reopen on the profile that was open last, if this board still has it.
				const lastProfileId = await getAtomicValue('currentProfileId');
				// From here on the board may be saved (null is a new account with no board yet).
				boardLoadedRef.current = true;
				if (response) {
					setDealbreaker(response);
					if (
						lastProfileId &&
						response[lastProfileId] &&
						currentProfileIdRef.current === 'main'
					) {
						setCurrentProfileId(lastProfileId);
					}
				}
			}, 1000);
		}
	};

	useEffect(() => {
		if (user) {
			fetchDealbreakers();
		}
	}, [user]);

	useEffect(
		() => () => {
			if (retryRef.current) clearTimeout(retryRef.current);
		},
		[]
	);

	return {
		fetchDealbreakers,
	};
};
