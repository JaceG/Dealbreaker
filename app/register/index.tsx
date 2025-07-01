import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Alert,
} from 'react-native';
// Uncomment these imports
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/Auth';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../constants/api';
import * as SecureStore from 'expo-secure-store';
import { AuthContextType } from '../login';
import { colors } from '../../libs/board/constants';
import useRegister from '../../hooks/useRegister';

// Initialize WebBrowser for auth session
WebBrowser.maybeCompleteAuthSession();

// Define types for component props
interface AuthProps {
	navigation: any; // Replace with proper navigation type if available
	onLogin?: () => void;
}

// Define types for Auth context

// Auth component that supports Google signin
const Auth: React.FC<AuthProps> = () => {
	const {
		name,
		setName,
		email,
		setEmail,
		password,
		setPassword,
		localError,
		handleTitlePress,
		handleSubmit,
		isLoading,
	} = useRegister();

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.formContainer}>
					<TouchableOpacity
						onPress={handleTitlePress}
						activeOpacity={0.8}>
						<Text style={styles.title}>Register</Text>
					</TouchableOpacity>

					<TextInput
						style={styles.input}
						placeholder='Name'
						value={name}
						onChangeText={setName}
						autoCapitalize='words'
						editable={!isLoading}
					/>

					<TextInput
						style={styles.input}
						placeholder='Email'
						value={email}
						onChangeText={setEmail}
						keyboardType='email-address'
						autoCapitalize='none'
						editable={!isLoading}
					/>

					<TextInput
						style={styles.input}
						placeholder='Password'
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						editable={!isLoading}
					/>

					{localError ? (
						<Text style={styles.errorText}>{localError}</Text>
					) : null}

					<TouchableOpacity
						style={[
							styles.button,
							isLoading ? styles.buttonDisabled : null,
						]}
						onPress={handleSubmit}
						disabled={isLoading}>
						{isLoading ? (
							<ActivityIndicator color='#fff' />
						) : (
							<Text style={styles.buttonText}>Register</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.switchButton}
						onPress={() => router.replace('/login')}
						disabled={isLoading}>
						<Text style={styles.switchButtonText}>
							Already have an account? Sign In
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	formContainer: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
		color: '#333',
	},
	input: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 10,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	button: {
		backgroundColor: colors.exodusFruit,
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 15,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	googleButton: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	googleButtonText: {
		color: '#333',
		fontSize: 16,
		fontWeight: '500',
	},
	testUserButton: {
		backgroundColor: '#28a745',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 15,
	},
	testUserButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	switchButton: {
		alignItems: 'center',
	},
	switchButtonText: {
		color: colors.exodusFruit,
		fontSize: 14,
	},
	errorText: {
		color: 'red',
		textAlign: 'center',
		marginBottom: 15,
	},
});

export default Auth;
