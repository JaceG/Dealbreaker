import Toast from 'react-native-toast-message';

export const showToast = (type, message) => {
	Toast.show({
		type: type,
		text1: message,
		position: 'top',
	});
};
