// ============================================================================
// Hospital Emergency Console - Live emergency alerts & ambulance dispatch
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, RefreshControl, Linking,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface EmergencyAlert {
  id: string;
  patient_name: string;
  phone: string;
  symptoms: string[];
  gps: { latitude: number; longitude: number };
  distance: string;
  time_ago: string;
  vital_signs?: { heart_rate?: number; blood_pressure?: string; oxygen?: number };
  status: 'INCOMING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED';
  ambulance_eta?: string;
}

export default function EmergencyConsole() {
  const [refreshing, setRefreshing] = useState(false);

  const [alerts, setAlerts] = useState<EmergencyAlert[]>([
    {
      id: '1',
      patient_name: 'Jane Wanjiku',
      phone: '+254712345678',
      symptoms: ['Severe chest pain', 'Difficulty breathing'],
      gps: { latitude: -1.2921, longitude: 36.8219 },
      distance: '3.2 km',
      time_ago: '2 min ago',
      vital_signs: { heart_rate: 120, blood_pressure: '160/95', oxygen: 88 },
      status: 'INCOMING',
    },
    {
      id: '2',
      patient_name: 'Samuel Kiprop',
      phone: '+254723456789',
      symptoms: ['Road accident', 'Leg injury', 'Bleeding'],
      gps: { latitude: -1.2850, longitude: 36.8300 },
      distance: '5.1 km',
      time_ago: '8 min ago',
      vital_signs: { heart_rate: 95, oxygen: 92 },
      status: 'DISPATCHED',
      ambulance_eta: '6 min',
    },
    {
      id: '3',
      patient_name: 'Agnes Muthoni',
      phone: '+254734567890',
      symptoms: ['Pregnancy complication', 'Heavy bleeding'],
      gps: { latitude: -1.3000, longitude: 36.8150 },
      distance: '2.8 km',
      time_ago: '12 min ago',
      status: 'ACKNOWLEDGED',
    },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      await fetch(`${API_BASE_URL}/hospital/emergency-alerts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {} finally {
      setRefreshing(false);
    }
  };

  const handleDispatch = (alert: EmergencyAlert) => {
    Alert.alert(
      'Dispatch Ambulance',
      `Send ambulance to ${alert.patient_name} at ${alert.distance}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch Now',
          style: 'destructive',
          onPress: () => {
            setAlerts(prev =>
              prev.map(a => a.id === alert.id ? { ...a, status: 'DISPATCHED' as const, ambulance_eta: '8 min' } : a)
            );
            Alert.alert('Dispatched', `Ambulance en route to ${alert.patient_name}`);
          },
        },
      ]
    );
  };

  const handleAcknowledge = (alert: EmergencyAlert) => {
    setAlerts(prev =>
      prev.map(a => a.id === alert.id ? { ...a, status: 'ACKNOWLEDGED' as const } : a)
    );
  };

  const handleResolve = (alert: EmergencyAlert) => {
    Alert.alert('Resolve', `Mark ${alert.patient_name}'s emergency as resolved?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: () => {
          setAlerts(prev =>
            prev.map(a => a.id === alert.id ? { ...a, status: 'RESOLVED' as const } : a)
          );
        },
      },
    ]);
  };

  const openMaps = (gps: { latitude: number; longitude: number }) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${gps.latitude},${gps.longitude}`;
    Linking.openURL(url);
  };

  const callPatient = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INCOMING': return '#E53E3E';
      case 'ACKNOWLEDGED': return '#D69E2E';
      case 'DISPATCHED': return '#3182CE';
      case 'RESOLVED': return '#38A169';
      default: return '#718096';
    }
  };

  const activeAlerts = alerts.filter(a => a.status !== 'RESOLVED');
  const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Emergency Console</Text>
          <Text style={styles.headerSubtitle}>{activeAlerts.length} active alerts</Text>
        </View>
        <View style={[styles.liveDot, { backgroundColor: activeAlerts.length > 0 ? '#FC8181' : '#48BB78' }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeAlerts.map((alert) => (
          <View key={alert.id} style={[styles.alertCard, { borderLeftColor: getStatusColor(alert.status) }]}>
            {/* Header */}
            <View style={styles.alertHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{alert.patient_name}</Text>
                <Text style={styles.timeText}>{alert.time_ago} • {alert.distance}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(alert.status) }]}>{alert.status}</Text>
              </View>
            </View>

            {/* Symptoms */}
            <View style={styles.symptomsRow}>
              {alert.symptoms.map((s) => (
                <View key={s} style={styles.symptomTag}>
                  <Text style={styles.symptomText}>{s}</Text>
                </View>
              ))}
            </View>

            {/* Vitals */}
            {alert.vital_signs && (
              <View style={styles.vitalsRow}>
                {alert.vital_signs.heart_rate && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>HR</Text>
                    <Text style={[styles.vitalValue, alert.vital_signs.heart_rate > 100 && { color: '#E53E3E' }]}>
                      {alert.vital_signs.heart_rate} bpm
                    </Text>
                  </View>
                )}
                {alert.vital_signs.blood_pressure && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>BP</Text>
                    <Text style={styles.vitalValue}>{alert.vital_signs.blood_pressure}</Text>
                  </View>
                )}
                {alert.vital_signs.oxygen && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>SpO₂</Text>
                    <Text style={[styles.vitalValue, alert.vital_signs.oxygen < 90 && { color: '#E53E3E' }]}>
                      {alert.vital_signs.oxygen}%
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Ambulance ETA */}
            {alert.ambulance_eta && (
              <View style={styles.etaBanner}>
                <Text style={styles.etaText}>🚑 Ambulance ETA: {alert.ambulance_eta}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.mapButton} onPress={() => openMaps(alert.gps)}>
                <Text style={styles.mapButtonText}>📍 Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.callButton} onPress={() => callPatient(alert.phone)}>
                <Text style={styles.callButtonText}>📞 Call</Text>
              </TouchableOpacity>
              {alert.status === 'INCOMING' && (
                <>
                  <TouchableOpacity style={styles.ackButton} onPress={() => handleAcknowledge(alert)}>
                    <Text style={styles.ackButtonText}>✓ Ack</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dispatchButton} onPress={() => handleDispatch(alert)}>
                    <Text style={styles.dispatchButtonText}>🚑 Dispatch</Text>
                  </TouchableOpacity>
                </>
              )}
              {alert.status === 'ACKNOWLEDGED' && (
                <TouchableOpacity style={styles.dispatchButton} onPress={() => handleDispatch(alert)}>
                  <Text style={styles.dispatchButtonText}>🚑 Dispatch</Text>
                </TouchableOpacity>
              )}
              {alert.status === 'DISPATCHED' && (
                <TouchableOpacity style={styles.resolveButton} onPress={() => handleResolve(alert)}>
                  <Text style={styles.resolveButtonText}>✓ Resolve</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {resolvedAlerts.length > 0 && (
          <>
            <Text style={styles.resolvedTitle}>Resolved ({resolvedAlerts.length})</Text>
            {resolvedAlerts.map((alert) => (
              <View key={alert.id} style={[styles.alertCard, { borderLeftColor: '#38A169', opacity: 0.6 }]}>
                <Text style={styles.patientName}>{alert.patient_name}</Text>
                <Text style={styles.timeText}>{alert.time_ago} • {alert.distance}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#F0FFF4', marginTop: 8, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.statusText, { color: '#38A169' }]}>RESOLVED</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#16213E' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#FC8181', fontWeight: '600', marginTop: 2 },
  liveDot: { width: 14, height: 14, borderRadius: 7 },
  content: { padding: 16, paddingBottom: 32 },
  alertCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#1A365D' },
  timeText: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  symptomTag: { backgroundColor: '#FFF5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 4 },
  symptomText: { fontSize: 12, color: '#E53E3E', fontWeight: '600' },
  vitalsRow: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 10, marginBottom: 10 },
  vitalItem: { flex: 1, alignItems: 'center' },
  vitalLabel: { fontSize: 11, color: '#A0AEC0', fontWeight: '600' },
  vitalValue: { fontSize: 15, fontWeight: 'bold', color: '#2D3748', marginTop: 2 },
  etaBanner: { backgroundColor: '#EBF8FF', padding: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  etaText: { fontSize: 14, fontWeight: 'bold', color: '#2B6CB0' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mapButton: { backgroundColor: '#EDF2F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  mapButtonText: { fontSize: 13, fontWeight: '600', color: '#2D3748' },
  callButton: { backgroundColor: '#EDF2F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  callButtonText: { fontSize: 13, fontWeight: '600', color: '#2D3748' },
  ackButton: { backgroundColor: '#FFFFF0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F6E05E' },
  ackButtonText: { fontSize: 13, fontWeight: '600', color: '#975A16' },
  dispatchButton: { backgroundColor: '#E53E3E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  dispatchButtonText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  resolveButton: { backgroundColor: '#48BB78', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  resolveButtonText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  resolvedTitle: { fontSize: 16, fontWeight: 'bold', color: '#A0AEC0', marginTop: 20, marginBottom: 10 },
});
