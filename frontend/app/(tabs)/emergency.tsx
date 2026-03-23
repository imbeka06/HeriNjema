// File: app/emergency.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

export default function Emergency() {
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);
  const [locationSent, setLocationSent] = useState(false);

  const triggerSOS = async () => {
    setIsLocating(true);
    
    try {
      // 1. Ask the user for GPS permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need location access to send an ambulance to your exact spot.');
        setIsLocating(false);
        return;
      }

      // 2. Grab the exact hardware coordinates
      let location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      // 3. Simulate sending those coordinates to your Node.js backend
      setTimeout(() => {
        setIsLocating(false);
        setLocationSent(true);
        Alert.alert(
          "🚨 AMBULANCE DISPATCHED",
          `Emergency services have received your GPS coordinates and are en route.\n\nLat: ${lat.toFixed(5)}\nLon: ${lon.toFixed(5)}`,
          [{ text: "I understand, stay safe." }]
        );
      }, 1500);

    } catch (error) {
      Alert.alert('GPS Error', 'Could not fetch your location. Please call 999 directly.');
      setIsLocating(false);
    }
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