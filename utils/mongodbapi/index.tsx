import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getSecureItem } from '../storage';
import { boardLog } from '../boardLog';

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
	const started = Date.now();
	try {
		await dealbreakerClient.post('/add-dealbreaker', {
			dealbreaker,
			userId,
		});
		boardLog('net.boardSave', { ok: true, ms: Date.now() - started });
		return true;
	} catch (error: unknown) {
		console.error('Error saving the board:', error);
		boardLog('net.boardSave', {
			ok: false,
			ms: Date.now() - started,
			status: axios.isAxiosError(error) ? error.response?.status : undefined,
		});
	}
};

// The board, null for an account with none yet, 'unauthorized' when the login token was refused, undefined when the request failed.
export const getDealbreakers = async (userId: string) => {
	const started = Date.now();
	try {
		const response = await dealbreakerClient.post('/get-dealbreakers', {
			id: userId,
		});
		boardLog('net.boardLoad', { ok: true, ms: Date.now() - started });
		return response.data;
	} catch (error: unknown) {
		console.error('Error loading the board:', error);
		const status = axios.isAxiosError(error) ? error.response?.status : undefined;
		boardLog('net.boardLoad', { ok: false, ms: Date.now() - started, status });
		if (status === 401 || status === 403) return 'unauthorized';
	}
};
