// ============================================================================
// File: app/(tabs)/index.tsx
// Home Dashboard - Quick Actions & Overview
// ============================================================================

import React from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Linking
} from 'react-native';
import { useRouter } from 'expo-router';

export default function Dashboard() {
  const router = useRouter();

  const openHeriBot = () => {
    const botNumber = '254757059907';
    const message = 'Hello HeriBot! I need some assistance.';
    const url = `whatsapp://send?phone=${botNumber}&text=${message}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to chat with HeriBot.');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>Imbeka Musa</Text>
        </View>

        {/* Upcoming Appointment */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Next Appointment</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Confirmed</Text>
            </View>
          </View>
          <Text style={styles.doctorName}>Dr. Sarah Kariuki</Text>
          <Text style={styles.appointmentDetails}>General Consultation</Text>
          <Text style={styles.appointmentTime}>Tomorrow, 10:00 AM</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/book')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Book</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/pay')}>
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionText}>Pay Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/records')}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionText}>Records</Text>
          </TouchableOpacity>
        </View>

        {/* Insurance Status */}
        <View style={styles.insuranceCard}>
          <View style={styles.insuranceHeader}>
            <Text style={styles.insuranceTitle}>SHA Insurance</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
          <Text style={styles.insuranceId}>Member ID: SHA-2026-XXXXX</Text>
          <Text style={styles.insuranceDetail}>Coverage: Inpatient + Outpatient</Text>
        </View>

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={() => router.push('/emergency')}>
          <Text style={styles.emergencyText}>🚨 Request Emergency Ambulance</Text>
        </TouchableOpacity>

        {/* HeriBot Card */}
        <TouchableOpacity style={styles.heribotCard} onPress={openHeriBot}>
          <View style={styles.whatsappCircle}>
            <Text style={styles.heribotIcon}>💬</Text>
          </View>
          <Text style={styles.heribotTitle}>Chat with HeriBot</Text>
          <Text style={styles.heribotSubtitle}>Instant assistance with services</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 32, marginTop: 40 },
  greeting: { fontSize: 16, color: '#4A5568' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#1A365D' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 32 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  badge: { backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#319795', fontSize: 12, fontWeight: 'bold' },
  doctorName: { fontSize: 20, fontWeight: 'bold', color: '#1A365D', marginBottom: 4 },
  appointmentDetails: { fontSize: 14, color: '#4A5568', marginBottom: 12 },
  appointmentTime: { fontSize: 14, color: '#3182CE', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 16 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  actionButton: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, alignItems: 'center', width: '30%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#2D3748' },
  insuranceCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#48BB78', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  insuranceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  insuranceTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  activeBadge: { backgroundColor: '#F0FFF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#38A169', fontSize: 12, fontWeight: 'bold' },
  insuranceId: { fontSize: 14, color: '#4A5568', marginBottom: 4 },
  insuranceDetail: { fontSize: 13, color: '#718096' },
  emergencyButton: { backgroundColor: '#FFF5F5', borderWidth: 2, borderColor: '#FC8181', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  emergencyText: { fontSize: 18, fontWeight: 'bold', color: '#E53E3E' },
  heribotCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#25D366' },
  whatsappCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#25D366', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  heribotIcon: { fontSize: 40 },
  heribotTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', textAlign: 'center' },
  heribotSubtitle: { fontSize: 14, color: '#4A5568', textAlign: 'center', marginTop: 4 },
});
