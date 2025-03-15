import AsyncStorage from '@react-native-async-storage/async-storage'

export const setList = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.log(error)
  }
}

export const getList = async key => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.log(error)
  }
}

export const setAtomicValue = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value)
  } catch (error) {
    console.log(error)
  }
}

export const getAtomicValue = async key => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value ? value : null
  } catch (error) {
    console.log(error)
  }
}

export const clearStorage = async () => {
  try {
    await AsyncStorage.clear()
  } catch (error) {
    console.log(error)
  }
}
