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
    <ThemedView style={styles.container}>
      {!isEmergency ? (
        // NORMAL STATE
        <View style={styles.normalState}>
          <View style={styles.infoSection}>
            <ThemedText type="title" style={styles.title}>
              Emergency Alert
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              One-click call for help 🆘
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyAlert}
          >
            <ThemedText style={styles.emergencyButtonText}>
              🔴 TAP FOR EMERGENCY
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.instructions}>
            <ThemedText style={styles.instructionTitle}>
              What happens when you tap:
            </ThemedText>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>1</ThemedText>
              <ThemedText style={styles.instructionText}>
                Your location is sent to nearest hospitals
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>2</ThemedText>
              <ThemedText style={styles.instructionText}>
                Emergency services are alerted instantly
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>3</ThemedText>
              <ThemedText style={styles.instructionText}>
                Your medical history is shared with responders
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>4</ThemedText>
              <ThemedText style={styles.instructionText}>
                Real-time tracking follows your journey
              </ThemedText>
            </View>
          </View>

          <View style={styles.hotlineSection}>
            <ThemedText style={styles.hotlineLabel}>
              Emergency Hotline:
            </ThemedText>
            <TouchableOpacity style={styles.hotlineButton}>
              <ThemedText style={styles.hotlineNumber}>
                📞 +254 (0)20 2726000
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // EMERGENCY ACTIVE STATE
        <View style={styles.emergencyState}>
          <Animated.View
            style={[
              styles.pulsingCircle,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <ThemedText style={styles.pulsingText}>
              🚨
            </ThemedText>
          </Animated.View>

          <ThemedText style={styles.emergencyTitle}>
            EMERGENCY ALERT ACTIVE
          </ThemedText>

          <ThemedText style={styles.emergencySubtitle}>
            Help is being sent to your location
          </ThemedText>

          {location && (
            <View style={styles.locationInfo}>
              <ThemedText style={styles.locationLabel}>Your Location:</ThemedText>
              <ThemedText style={styles.locationCoords}>
                Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
              </ThemedText>
            </View>
          )}

          <View style={styles.symptomSelect}>
            <ThemedText style={styles.symptomTitle}>
              Select symptoms (optional):
            </ThemedText>
            <View style={styles.symptomGrid}>
              {symptomOptions.map(symptom => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.symptomButton,
                    symptoms.includes(symptom) && styles.symptomButtonActive
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <ThemedText
                    style={[
                      styles.symptomText,
                      symptoms.includes(symptom) && styles.symptomTextActive
                    ]}
                  >
                    {symptom}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
            onPress={handleEmergencyAlert}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.confirmButtonText}>
                ✓ CONFIRM & SEND ALERT
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <ThemedText style={styles.cancelButtonText}>
              Cancel Emergency
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  normalState: {
    flex: 1,
    justifyContent: 'center'
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    color: '#d32f2f'
  },
  subtitle: {
    fontSize: 16,
    color: '#666'
  },
  emergencyButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  instructions: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    width: 30
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18
  },
  hotlineSection: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center'
  },
  hotlineLabel: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 8
  },
  hotlineButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6
  },
  hotlineNumber: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600'
  },
  emergencyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pulsingCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  pulsingText: {
    fontSize: 50
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 5
  },
  emergencySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  locationInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%'
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  locationCoords: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  symptomSelect: {
    width: '100%',
    marginBottom: 20
  },
  symptomTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8
  },
  symptomButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  symptomButtonActive: {
    backgroundColor: '#d32f2f',
    borderColor: '#d32f2f'
  },
  symptomText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  symptomTextActive: {
    color: '#fff'
  },
  confirmButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%'
  },
  confirmButtonDisabled: {
    opacity: 0.6
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%'
  },
  cancelButtonText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: '600'
  }
});