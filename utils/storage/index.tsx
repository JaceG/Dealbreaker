import AsyncStorage from "@react-native-async-storage/async-storage";
import SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Secure storage functions
export const setSecureItem = async (key, value) => {
  try {
    // Our mock automatically handles fallback
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.log("Error storing secure value:", error);
    // Fallback to AsyncStorage on error
    try {
      await AsyncStorage.setItem(`secure_${key}`, value);
    } catch (innerError) {
      console.log("AsyncStorage fallback also failed:", innerError);
    }
  }
};

export const getSecureItem = async (key) => {
  try {
    // Our mock automatically handles fallback
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.log("Error retrieving secure value:", error);
    // Fallback to AsyncStorage on error
    try {
      return await AsyncStorage.getItem(`secure_${key}`);
    } catch (innerError) {
      console.log("AsyncStorage fallback also failed:", innerError);
      return null;
    }
  }
};

export const deleteSecureItem = async (key) => {
  try {
    // Our mock automatically handles fallback
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.log("Error deleting secure value:", error);
    // Fallback to AsyncStorage on error
    try {
      await AsyncStorage.removeItem(`secure_${key}`);
    } catch (innerError) {
      console.log("AsyncStorage fallback also failed:", innerError);
    }
  }
};

export const setList = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log(error);
  }
};

export const getList = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.log(error);
  }
};

export const setAtomicValue = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.log(error);
  }
};

export const getAtomicValue = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? value : null;
  } catch (error) {
    console.log(error);
  }
};

export const clearStorage = async () => {
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
