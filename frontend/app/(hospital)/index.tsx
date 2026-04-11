// ============================================================================
// Hospital Staff Dashboard - Live overview of hospital operations
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { getItem, deleteItem } from '@/utils/secure-store';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface DashboardStats {
  todayAppointments: number;
  pendingTriage: number;
  activeEmergencies: number;
  pendingBills: number;
  bedsAvailable: number;
  totalBeds: number;
}

export default function HospitalDashboard() {
  const router = useRouter();
  const [staffName, setStaffName] = useState('Staff');
  const [hospitalName, setHospitalName] = useState('Hospital');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 24,
    pendingTriage: 7,
    activeEmergencies: 2,
    pendingBills: 15,
    bedsAvailable: 18,
    totalBeds: 50,
  });

  useEffect(() => {
    loadStaffInfo();
  }, []);

  const loadStaffInfo = async () => {
    try {
      const name = await getItem('staff_name');
      const hospital = await getItem('hospital_name');
      if (name) setStaffName(name);
      if (hospital) setHospitalName(hospital);
    } catch {}
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/hospital/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Keep mock data on error
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await deleteItem('auth_token');
          await deleteItem('user_id');
          await deleteItem('user_type');
          router.replace('/');
        },
      },
    ]);
  };

  const statCards: { label: string; value: string | number; icon: string; color: string; onPress?: () => void }[] = [
    { label: 'Today\'s Appointments', value: stats.todayAppointments, icon: '📅', color: '#3182CE', onPress: () => router.push('/triage' as any) },
    { label: 'Pending Triage', value: stats.pendingTriage, icon: '🩺', color: '#D69E2E', onPress: () => router.push('/triage' as any) },
    { label: 'Active Emergencies', value: stats.activeEmergencies, icon: '🚨', color: '#E53E3E', onPress: () => router.push('/emergencies' as any) },
    { label: 'Pending Bills', value: stats.pendingBills, icon: '💳', color: '#38A169', onPress: () => router.push('/billing' as any) },
    { label: 'Bed Availability', value: `${stats.bedsAvailable}/${stats.totalBeds}`, icon: '🛏️', color: '#805AD5' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</Text>
          <Text style={styles.staffName}>{staffName}</Text>
          <Text style={styles.hospitalLabel}>{hospitalName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFF" />}
      >
        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {statCards.map((card) => (
            <TouchableOpacity
              key={card.label}
              style={styles.statCard}
              onPress={card.onPress}
              activeOpacity={card.onPress ? 0.7 : 1}
            >
              <Text style={styles.statIcon}>{card.icon}</Text>
              <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/triage' as any)}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Review Triage Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/emergencies' as any)}>
            <Text style={styles.actionIcon}>🚑</Text>
            <Text style={styles.actionText}>Emergency Console</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/billing' as any)}>
            <Text style={styles.actionIcon}>🧾</Text>
            <Text style={styles.actionText}>Billing & Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { borderLeftColor: '#E53E3E', borderLeftWidth: 3 }]} onPress={handleLogout}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity Feed */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: '#E53E3E' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>Emergency alert from Jane Wanjiku — GPS received</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: '#D69E2E' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>New triage: John Omondi — Severity HIGH (chest pain)</Text>
              <Text style={styles.activityTime}>8 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: '#38A169' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>M-Pesa payment received — Ksh 3,500 from Peter Musa</Text>
              <Text style={styles.activityTime}>15 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: '#3182CE' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>Appointment confirmed — Dr. Kariuki with Mary Adhiambo</Text>
              <Text style={styles.activityTime}>22 minutes ago</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 40, backgroundColor: '#1A365D' },
  greeting: { fontSize: 14, color: '#A0CDF4' },
  staffName: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginTop: 2 },
  hospitalLabel: { fontSize: 13, color: '#90CDF4', marginTop: 2 },
  logoutButton: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  logoutText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 12, marginTop: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { backgroundColor: '#FFF', width: '48%', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#718096', marginTop: 4, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  actionCard: { backgroundColor: '#FFF', width: '48%', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#2D3748', textAlign: 'center' },
  activityCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 5 },
  activityText: { fontSize: 14, color: '#2D3748', lineHeight: 20 },
  activityTime: { fontSize: 11, color: '#A0AEC0', marginTop: 2 },
});
