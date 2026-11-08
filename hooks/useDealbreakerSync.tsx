import { useContext, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import StoreContext from '../store';
import { getDealbreakers } from '../utils/mongodbapi';

export const useDealbreakerSync = (user: any) => {
	const { setDealbreaker, boardLoadedRef } = useContext<any>(StoreContext);
	const isDealbreakerTimeoutRef = useRef<
		boolean | ReturnType<typeof setTimeout>
	>(false);

	const fetchDealbreakers = async () => {
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
				// From here on the board may be saved (an empty response is a new account).
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

	return {
		fetchDealbreakers,
	};
};
