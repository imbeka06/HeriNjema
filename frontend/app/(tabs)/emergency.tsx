// ============================================================================
// File: app/(tabs)/emergency.tsx
// Emergency Alert Screen - One-Click Emergency Call with Backend Integration
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const { width } = Dimensions.get('window');

interface VitalSigns {
  heart_rate?: number;
  blood_pressure?: string;
  temperature?: number;
  oxygen_saturation?: number;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export default function Emergency() {
  const router = useRouter();
  const [isEmergency, setIsEmergency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [vitals, setVitals] = useState<VitalSigns>({});
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ========================================================================
  // ANIMATION FOR PULSE EFFECT
  // ========================================================================

  useEffect(() => {
    if (isEmergency) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: false
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false
          })
        ])
      ).start();
    }
  }, [isEmergency]);

  // ========================================================================
  // REQUEST LOCATION PERMISSIONS
  // ========================================================================

  const requestLocationPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for emergency alerts');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  // ========================================================================
  // GET CURRENT LOCATION
  // ========================================================================

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) return null;

      const userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      return {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  // ========================================================================
  // SEND EMERGENCY ALERT
  // ========================================================================

  const handleEmergencyAlert = async () => {
    if (!isEmergency) {
      // First tap - confirm emergency
      Alert.alert(
        'Emergency Alert',
        'Are you experiencing a life-threatening emergency?',
        [
          {
            text: 'No, Cancel',
            onPress: () => setIsEmergency(false),
            style: 'cancel'
          },
          {
            text: 'Yes, Emergency',
            onPress: () => setIsEmergency(true),
            style: 'destructive'
          }
        ]
      );
      return;
    }

    // Second tap - send alert
    setLoading(true);
    try {
      // Get location
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        Alert.alert('Location Error', 'Could not obtain your location');
        setLoading(false);
        return;
      }

      setLocation(currentLocation);

      // Get stored user info
      const token = await SecureStore.getItemAsync('auth_token');
      const userId = await SecureStore.getItemAsync('user_id');

      if (!token) {
        Alert.alert('Auth Error', 'Please login first');
        setLoading(false);
        return;
      }

      // Send emergency alert to backend
      const response = await fetch(`${API_BASE_URL}/hospital/emergency-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: userId,
          gps_location: currentLocation,
          vital_signs: vitals,
          symptoms: symptoms || ['Emergency'],
          emergency_message: emergencyMessage || 'Patient initiated emergency alert'
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsEmergency(false);
        Alert.alert(
          'Emergency Alert Sent',
          'Nearby hospitals and emergency services have been notified. Help is on the way.',
          [
            {
              text: 'OK',
              onPress: () => {}
            }
          ]
        );
      } else {
        Alert.alert('Alert Failed', data.message || 'Failed to send emergency alert');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send emergency alert');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // CANCEL EMERGENCY
  // ========================================================================

  const handleCancel = () => {
    Alert.alert(
      'Cancel Emergency',
      'Are you sure you want to cancel the emergency alert?',
      [
        {
          text: 'Keep Alert Active',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Cancel Alert',
          onPress: () => {
            setIsEmergency(false);
            setSymptoms([]);
            setEmergencyMessage('');
            setVitals({});
          },
          style: 'destructive'
        }
      ]
    );
  };

  // ========================================================================
  // QUICK SYMPTOM SELECTION
  // ========================================================================

  const symptomOptions = [
    'Chest Pain',
    'Unconscious',
    'Severe Bleeding',
    'Difficulty Breathing',
    'Severe Injury',
    'Other'
  ];

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Cancel & Go Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.warningTitle}>EMERGENCY ASSISTANCE</Text>
        <Text style={styles.warningText}>
          Pressing the SOS button will immediately extract your GPS location and dispatch the nearest available ambulance to your coordinates.
        </Text>

        {/* The Giant Red Panic Button */}
        <TouchableOpacity 
          style={[styles.sosButton, locationSent && styles.sosButtonSuccess]} 
          onPress={triggerSOS}
          disabled={isLocating || locationSent}
        >
          {isLocating ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Text style={styles.sosText}>{locationSent ? "HELP IS ON THE WAY" : "S O S"}</Text>
          )}
        </TouchableOpacity>

        {isLocating && <Text style={styles.locatingText}>Acquiring GPS Satellite Lock...</Text>}
      </View>

    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' }, // Very light red background
  header: { padding: 20, paddingTop: 40 },
  backText: { fontSize: 16, color: '#4A5568', fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  warningTitle: { fontSize: 24, fontWeight: 'bold', color: '#C53030', marginBottom: 16, textAlign: 'center' },
  warningText: { fontSize: 16, color: '#4A5568', textAlign: 'center', marginBottom: 60, lineHeight: 24 },
  sosButton: { 
    width: 250, height: 250, borderRadius: 125, backgroundColor: '#E53E3E', 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#E53E3E', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    borderWidth: 8, borderColor: '#FED7D7'
  },
  sosButtonSuccess: { backgroundColor: '#38A169', shadowColor: '#38A169', borderColor: '#C6F6D5' },
  sosText: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: 4 },
  locatingText: { marginTop: 30, fontSize: 16, color: '#C53030', fontWeight: 'bold' }
});