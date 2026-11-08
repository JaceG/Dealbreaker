import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getSecureItem } from '../storage';

// The whole board (every profile's cards) is saved and loaded as one document.
const dealbreakerClient = axios.create({
	baseURL: API_BASE_URL + '/api/dealbreaker',
	headers: {
		'Content-Type': 'application/json',
	},
});
// Board routes need the login token, same as the flag-history client in utils/api.
dealbreakerClient.interceptors.request.use(async (config) => {
	const token = await getSecureItem('authToken');
	if (token) config.headers['x-auth-token'] = token;
	return config;
});

export const addDealbreakers = async (
	dealbreaker: any,
	userId: string | number
): Promise<boolean | undefined> => {
	try {
		await dealbreakerClient.post('/add-dealbreaker', {
			dealbreaker,
			userId,
		});
		return true;
	} catch (error: unknown) {
		console.error('Error saving the board:', error);
	}
};

export const getDealbreakers = async (userId: string) => {
	try {
		const response = await dealbreakerClient.post('/get-dealbreakers', {
			id: userId,
		});
		return response.data;
	} catch (error: unknown) {
		console.error('Error loading the board:', error);
	}
};
