// ============================================================================
// File: frontend/app/index.tsx
// Login Screen - Smartphone & Feature Phone Compatible
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { HelloWave } from '@/components/hello-wave';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface LoginResponse {
  success: boolean;
  token?: string;
  user_id?: string;
  user_type?: string;
  message?: string;
  // Nested data format (some endpoints use this)
  data?: {
    token?: string;
    user_id?: string;
    user_type?: string;
  };
}

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [savedPhoneNumber, setSavedPhoneNumber] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Initialize biometric availability check + auto-login if session exists
  useEffect(() => {
    checkBiometricAvailability();
    loadSavedPhoneNumber();
    checkExistingSession();
  }, []);

  // ========================================================================
  // ROUTE BASED ON USER TYPE
  // ========================================================================

  const navigateByUserType = (userType: string | null) => {
    if (userType === 'HOSPITAL_STAFF' || userType === 'ADMIN' || userType === 'DOCTOR') {
      router.replace('/(hospital)/index' as any);
    } else {
      router.replace('/(tabs)');
    }
  };

  // ========================================================================
  // CHECK EXISTING SESSION (auto-login on app restart)
  // ========================================================================

  const checkExistingSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userType = await SecureStore.getItemAsync('user_type');
      if (token) {
        // Token exists — try biometric re-auth if available, else go straight in
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify your identity to continue',
            cancelLabel: 'Use Password',
            disableDeviceFallback: false,
          });
          if (result.success) {
            navigateByUserType(userType);
            return;
          }
        } else {
          // No biometric — auto-navigate with existing token
          navigateByUserType(userType);
          return;
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  // ========================================================================
  // BIOMETRIC CHECK
  // ========================================================================

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else {
          setBiometricType('Biometric');
        }
      }
    } catch (error) {
      console.error('Biometric check failed:', error);
    }
  };

  // ========================================================================
  // LOAD SAVED PHONE NUMBER
  // ========================================================================

  const loadSavedPhoneNumber = async () => {
    try {
      const saved = await SecureStore.getItemAsync('last_phone_number');
      if (saved) {
        setSavedPhoneNumber(saved);
        setPhoneNumber(saved);
      }
    } catch (error) {
      console.error('Failed to load saved phone:', error);
    }
  };

  // ========================================================================
  // PHONE NUMBER VALIDATION
  // ========================================================================

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits
    let cleaned = input.replace(/\D/g, '');

    // Ensure it starts with 254 (Kenya)
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    // Format as +254xxxxxxxxxx
    if (cleaned.length > 12) {
      cleaned = cleaned.substring(0, 12);
    }

    return '+' + cleaned;
  };

  // ========================================================================
  // LOGIN WITH PASSWORD
  // ========================================================================

  const handleLoginWithPassword = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter phone number and password');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          password: password
        })
      });

      const data: LoginResponse = await response.json();

      if (data.success && (data.token || data.data?.token)) {
        const token = data.token || data.data?.token;
        const userId = data.user_id || data.data?.user_id;
        const userType = data.user_type || data.data?.user_type;

        if (token) await SecureStore.setItemAsync('auth_token', token);
        if (userId) await SecureStore.setItemAsync('user_id', userId);
        if (userType) await SecureStore.setItemAsync('user_type', userType);
        await SecureStore.setItemAsync('last_phone_number', formattedPhone);

        // Navigate based on role
        navigateByUserType(userType || null);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error: any) {
      Alert.alert('Connection Error', error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // BIOMETRIC LOGIN
  // ========================================================================

  const handleBiometricLogin = async () => {
    if (!savedPhoneNumber) {
      Alert.alert('Info', 'Please login with password first to enable biometric');
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in to HeriNjema`,
        cancelLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Retrieve stored token and route by role
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedUserId = await SecureStore.getItemAsync('user_id');
        const storedUserType = await SecureStore.getItemAsync('user_type');

        if (storedToken && storedUserId) {
          navigateByUserType(storedUserType);
        } else {
          Alert.alert('Session Expired', 'Please login with your password');
        }
      } else if (result.error === 'user_cancel') {
        // User cancelled — do nothing, let them type password
      } else {
        Alert.alert('Authentication Failed', 'Please try again or use your password');
      }
    } catch (error: any) {
      Alert.alert('Biometric Error', error.message);
    }
  };

  // ========================================================================
  // REGISTER NAVIGATION
  // ========================================================================

  const handleRegisterPress = () => {
    Alert.alert('Register', 'Please visit https://herinjema.co.ke/register to create an account');
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {checkingSession ? (
        <View style={styles.splashContainer}>
          <Text style={styles.splashIcon}>🏥</Text>
          <Text style={styles.splashTitle}>HeriNjema</Text>
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <HelloWave />
            <ThemedText type="title" style={styles.title}>
              Welcome to HeriNjema
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Your healthcare, your way 🏥
            </ThemedText>
          </View>

          {/* LOGIN FORM */}
          <View style={styles.form}>
            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="0712345678 or +254712345678"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={styles.eyeButton}
                >
                  <ThemedText style={styles.eyeIcon}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLoginWithPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.loginButtonText}>
                  Sign In
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Biometric Login */}
            {biometricAvailable && savedPhoneNumber && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <ThemedText style={styles.biometricButtonText}>
                  🔐 Quick Login with {biometricType}
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotPasswordLink}>
              <ThemedText style={styles.forgotPasswordText}>
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* REGISTER SECTION */}
          <View style={styles.registerSection}>
            <ThemedText style={styles.registerText}>
              Don't have an account?
            </ThemedText>
            <TouchableOpacity onPress={handleRegisterPress}>
              <ThemedText style={styles.registerLink}>
                Create Account
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* DEMO MODE - Quick access for testing */}
          <View style={styles.demoSection}>
            <ThemedText style={styles.demoTitle}>🧪 Demo Mode</ThemedText>
            <ThemedText style={styles.demoSubtitle}>
              Preview the app without signing in
            </ThemedText>
            <View style={styles.demoButtons}>
              <TouchableOpacity
                style={styles.demoButtonPatient}
                onPress={() => {
                  SecureStore.setItemAsync('user_type', 'PATIENT');
                  router.replace('/(tabs)');
                }}
              >
                <ThemedText style={styles.demoButtonText}>
                  🏠 Enter as Patient
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoButtonStaff}
                onPress={() => {
                  SecureStore.setItemAsync('user_type', 'HOSPITAL_STAFF');
                  router.replace('/(hospital)/index' as any);
                }}
              >
                <ThemedText style={styles.demoButtonText}>
                  🏥 Enter as Hospital Staff
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* FEATURE PHONE INFO */}
          <View style={styles.featurePhoneInfo}>
            <ThemedText style={styles.featurePhoneText}>
              📱 Using a basic phone? Dial *384*123# to access HeriNjema
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  splashIcon: {
    fontSize: 64,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A365D',
    marginTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center'
  },
  form: {
    paddingHorizontal: 20,
    marginBottom: 30
  },
  inputGroup: {
    marginBottom: 18
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000'
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000'
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  eyeIcon: {
    fontSize: 18
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  loginButtonDisabled: {
    opacity: 0.6
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  biometricButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500'
  },
  forgotPasswordLink: {
    alignItems: 'center',
    marginTop: 14
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20
  },
  registerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 5
  },
  registerLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600'
  },
  featurePhoneInfo: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 4
  },
  featurePhoneText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500'
  },
  demoSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: 4,
  },
  demoSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButtonPatient: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonStaff: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  }
});
