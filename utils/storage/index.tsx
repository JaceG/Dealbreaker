import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Secure storage functions
export const setSecureItem = async (
	key: string,
	value: string
): Promise<void> => {
	try {
		// Our mock automatically handles fallback
		await SecureStore.setItemAsync(key, value);
	} catch (error) {
		console.log('Error storing secure value:', error);
		// Fallback to AsyncStorage on error
		try {
			await AsyncStorage.setItem(`secure_${key}`, value);
		} catch (innerError) {
			console.log('AsyncStorage fallback also failed:', innerError);
		}
	}
};

export const getSecureItem = async (key: string): Promise<string | null> => {
	try {
		// Our mock automatically handles fallback
		return await SecureStore.getItemAsync(key);
	} catch (error) {
		console.log('Error retrieving secure value:', error);
		// Fallback to AsyncStorage on error
		try {
			return await AsyncStorage.getItem(`secure_${key}`);
		} catch (innerError) {
			console.log('AsyncStorage fallback also failed:', innerError);
			return null;
		}
	}
};

export const deleteSecureItem = async (key: string): Promise<void> => {
	try {
		// Our mock automatically handles fallback
		await SecureStore.deleteItemAsync(key);
	} catch (error) {
		console.log('Error deleting secure value:', error);
		// Fallback to AsyncStorage on error
		try {
			await AsyncStorage.removeItem(`secure_${key}`);
		} catch (innerError) {
			console.log('AsyncStorage fallback also failed:', innerError);
		}
	}
};

export const setList = async (key: string, value: any[]): Promise<void> => {
	try {
		await AsyncStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.log(error);
	}
};

export const getList = async (key: string): Promise<any[] | null> => {
	try {
		const value = await AsyncStorage.getItem(key);
		return value ? JSON.parse(value) : null;
	} catch (error) {
		console.log(error);
		return null;
	}
};

export const setAtomicValue = async (
	key: string,
	value: string
): Promise<void> => {
	try {
		await AsyncStorage.setItem(key, value);
	} catch (error) {
		console.log(error);
	}
};

export const getAtomicValue = async (key: string): Promise<string | null> => {
	try {
		const value = await AsyncStorage.getItem(key);
		return value ? value : null;
	} catch (error) {
		console.log(error);
		return null;
	}
};

export const clearStorage = async (): Promise<void> => {
	try {
		await AsyncStorage.clear();
	} catch (error) {
		console.log(error);
	}
};

export const clearKeys = async (keys: string[]) => {
	try {
		await AsyncStorage.multiRemove(keys);
	} catch (error) {
		console.log(error);
	}
};
