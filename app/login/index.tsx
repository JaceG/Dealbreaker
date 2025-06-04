import React, { useState, useEffect } from "react";
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
} from "react-native";
// Uncomment these imports
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../context/Auth";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import * as SecureStore from "expo-secure-store";

// Initialize WebBrowser for auth session
WebBrowser.maybeCompleteAuthSession();

// Define types for component props
interface AuthProps {
  navigation: any; // Replace with proper navigation type if available
  onLogin?: () => void;
}

// Define types for Auth context
interface AuthContextType {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  promptGoogleSignIn: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  createTestUser: () => Promise<boolean>;
}

// Auth component that supports Google signin
const Auth: React.FC<AuthProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [showDevOptions, setShowDevOptions] = useState(false);

  // Get auth functions from context
  const { isLoading, error, checkAuthStatus } = useAuth() as AuthContextType;

  // Clear error when switching between login/register
  useEffect(() => {
    setLocalError("");
  }, [isLogin]);

  // Display error from context if available
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const handleSubmit = async () => {
    if (isLoading) return;

    // Reset error state
    setLocalError("");

    // Basic validation
    if (isLogin && (!email || !password)) {
      setLocalError("Please enter both email and password");
      return;
    }

    if (!isLogin && (!name || !email || !password)) {
      setLocalError("Please fill in all fields");
      return;
    }

    try {
      let success;

      if (isLogin) {
        success = await login(email, password);
      } else {
        // success = await register(name, email, password);
      }
      if (success) {
        setEmail("");
        setPassword("");
        await checkAuthStatus();
        router.replace("/(tabs)");
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      setLocalError(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  };

  // Toggle dev options with a secret tap
  const handleTitlePress = () => {
    // Track number of taps to reveal dev options after 5 taps
    if (!showDevOptions) {
      setShowDevOptions(true);
    }
  };

  // Create a test user
  const handleCreateTestUser = async () => {
    const success = await createTestUser();
    if (success && onLogin) {
      onLogin();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log(
        `Attempting to login with API: ${API_BASE_URL}/api/auth/login`
      );
      console.log("Login payload:", { email, password: "••••••••" });

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }).catch((error) => {
        console.error("Network error during login:", error);
        throw new Error(
          "Network connection failed. Please check your internet connection."
        );
      });

      console.log("Login response status:", response.status);

      if (!response) {
        throw new Error("Server connection failed. Please try again later.");
      }

      const data = await response.json();
      console.log("Login response data:", {
        ...data,
        token: data.token ? "••••••••" : undefined,
      });

      if (!response.ok) {
        // Handle the errors array format from the backend
        if (data.errors && Array.isArray(data.errors)) {
          const errorMsg = data.errors[0].msg || "Login failed";
          console.error("Login validation error:", errorMsg);
          throw new Error(errorMsg);
        }
        console.error(
          "Login error from server:",
          data.message || "Unknown error"
        );
        throw new Error(
          data.message || "Login failed. Please check your credentials."
        );
      }

      // The backend only returns a token, so we need to fetch user info
      const token = data.token;

      // Save token first
      await SecureStore.setItemAsync("authToken", token);

      // Now fetch user info
      console.log("Fetching user info with token");
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/user`, {
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      }).catch((error) => {
        console.error("Error fetching user data:", error);
        throw new Error("Failed to fetch user information after login");
      });

      console.log("User info response status:", userResponse.status);

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        console.error("User info error:", errorData);
        throw new Error("Failed to fetch user information");
      }

      const userData = await userResponse.json();
      console.log("User data received:", {
        ...userData,
        _id: userData._id ? "••••••••" : undefined,
      });

      // Transform MongoDB _id to id for consistency in the app
      const normalizedUserData = {
        ...userData,
        id: userData._id, // Add id field based on MongoDB's _id
      };

      // Save user data
      await SecureStore.setItemAsync(
        "userData",
        JSON.stringify(normalizedUserData)
      );
      console.log("Login successful");
      return true;
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Error",
        error instanceof Error
          ? error.message
          : "Failed to login. Please try again."
      );
      return false;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.8}>
            <Text style={styles.title}>
              {isLogin ? "Welcome Back!" : "Create Account"}
            </Text>
          </TouchableOpacity>

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          {localError ? (
            <Text style={styles.errorText}>{localError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Login" : "Register"}
              </Text>
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
            onPress={() => router.push("/register")}
            disabled={isLoading}
          >
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
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  googleButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  testUserButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  testUserButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  switchButton: {
    alignItems: "center",
  },
  switchButtonText: {
    color: "#007bff",
    fontSize: 14,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 15,
  },
});

export default Auth;
