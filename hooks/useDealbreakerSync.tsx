import { useContext, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import StoreContext from '../store';
import { getDealbreakers } from '../utils/mongodbapi';

export const useDealbreakerSync = (user: any) => {
	const { setDealbreaker, boardLoadedRef } = useContext<any>(StoreContext);
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
				// undefined = the request failed (Render may be asleep): keep saving off and try again.
				if (response === undefined) {
					retryRef.current = setTimeout(fetchDealbreakers, 15000);
					return;
				}
				// From here on the board may be saved (null is a new account with no board yet).
				boardLoadedRef.current = true;
				if (response) {
					setDealbreaker(response);
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
