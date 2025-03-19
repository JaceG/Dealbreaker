import Toast from 'react-native-toast-message'

export const showToast = (type, message) => {
  console.log(`Showing toast: ${type} - ${message}`)
  Toast.show({
    type: type.toLowerCase(),
    text1: message,
    position: 'top'
  })
}
