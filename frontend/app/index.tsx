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
}

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedPhoneNumber, setSavedPhoneNumber] = useState('');

  // Initialize biometric availability check
  useEffect(() => {
    checkBiometricAvailability();
    loadSavedPhoneNumber();
  }, []);

  // ========================================================================
  // BIOMETRIC CHECK
  // ========================================================================

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
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

      if (data.success && data.token) {
        // Save token to secure storage
        if (data.token) await SecureStore.setItemAsync('auth_token', data.token);
        if (data.user_id) await SecureStore.setItemAsync('user_id', data.user_id);
        if (data.user_type) await SecureStore.setItemAsync('user_type', data.user_type);
        await SecureStore.setItemAsync('last_phone_number', formattedPhone);

        // Navigate to app tabs
        router.replace('/(tabs)');
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
        disableDeviceFallback: false
      });

      if (result.success) {
        // Retrieve stored token and check if still valid
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedUserId = await SecureStore.getItemAsync('user_id');
        const storedUserType = await SecureStore.getItemAsync('user_type');

        if (storedToken && storedUserId) {
          // Token verification could be done here
          // For now, assume it's valid if it exists
          router.replace('/(tabs)');
        } else {
          Alert.alert('Session Expired', 'Please login again');
        }
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
                  🔐 Quick Login with Fingerprint
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

          {/* FEATURE PHONE INFO */}
          <View style={styles.featurePhoneInfo}>
            <ThemedText style={styles.featurePhoneText}>
              📱 Using a basic phone? Dial *384*123# to access HeriNjema
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
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
  }
});
