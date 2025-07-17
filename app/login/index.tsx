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
import { router } from 'expo-router';
import { colors } from '../../libs/board/constants';
import useLogin from '../../hooks/useLogin';
import { User } from '../../context/Auth';

// Initialize WebBrowser for auth session
WebBrowser.maybeCompleteAuthSession();

// Define types for component props
interface AuthProps {
	navigation: any; // Replace with proper navigation type if available
	onLogin?: () => void;
}

// Define types for Auth context
export interface AuthContextType {
	login: (email: string, password: string) => Promise<boolean>;
	register: (
		name: string,
		email: string,
		password: string
	) => Promise<boolean>;
	promptGoogleSignIn: () => Promise<boolean>;
	isLoading: boolean;
	error: string | null;
	createTestUser: () => Promise<boolean>;
	checkAuthStatus: () => Promise<boolean>;
	loginAuth: (user: unknown, token: string) => Promise<void>;
	clearAuth: () => void;
	user: User;
}

// Auth component that supports Google signin
const Auth: React.FC<AuthProps> = () => {
	const {
		isLogin,
		setIsLogin,
		name,
		setName,
		email,
		setEmail,
		password,
		setPassword,
		handleSubmit,
		handleTitlePress,
		isLoading,
		localError,
	} = useLogin();

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.formContainer}>
					<TouchableOpacity
						onPress={handleTitlePress}
						activeOpacity={0.8}>
						<Text style={styles.title}>
							{isLogin ? 'Welcome Back!' : 'Create Account'}
						</Text>
					</TouchableOpacity>

					{!isLogin && (
						<TextInput
							style={styles.input}
							placeholder='Name'
							value={name}
							onChangeText={setName}
							autoCapitalize='words'
							editable={!isLoading}
						/>
					)}

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
						onPress={() => handleSubmit(false)}
						disabled={isLoading}>
						{isLoading ? (
							<ActivityIndicator color='#fff' />
						) : (
							<Text style={styles.buttonText}>
								{isLogin ? 'Login' : 'Register'}
							</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.button2,
							isLoading ? styles.buttonDisabled : null,
						]}
						onPress={() => handleSubmit(true)}
						disabled={isLoading}>
						{isLoading ? (
							<ActivityIndicator color='#fff' />
						) : (
							<Text style={styles.buttonText}>Just Try It</Text>
						)}
					</TouchableOpacity>

					{/* <TouchableOpacity
                        style={[
                            styles.googleButton,
                            isLoading ? styles.buttonDisabled : null,
                        ]}
                        onPress={promptGoogleSignIn}
                        disabled={isLoading}>
                        <Text style={styles.googleButtonText}>
                            Continue with Google
                        </Text>
                    </TouchableOpacity> */}
					{/* 
          {showDevOptions && (
            <TouchableOpacity
              style={[
                styles.testUserButton,
                isLoading ? styles.buttonDisabled : null,
              ]}
              onPress={handleCreateTestUser}
              disabled={isLoading}
            >
              <Text style={styles.testUserButtonText}>Create Test User</Text>
            </TouchableOpacity>
          )} */}

					<TouchableOpacity
						style={styles.switchButton}
						onPress={() => router.push('/register')}
						disabled={isLoading}>
						<Text style={styles.switchButtonText}>
							Don't have an account? Sign Up
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
	button2: {
		backgroundColor: colors.deepComaru,
		width: '75%',
		margin: 'auto',
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
