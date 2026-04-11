// ============================================================================
// Hospital Triage Queue - Review & prioritize patient appointments
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { getItem } from '@/utils/secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface TriagePatient {
  id: string;
  patient_name: string;
  symptoms: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  triage_score: number;
  arrival_time: string;
  booking_method: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  assigned_doctor?: string;
}

export default function TriageQueue() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const [patients] = useState<TriagePatient[]>([
    { id: '1', patient_name: 'John Omondi', symptoms: ['Chest pain', 'Shortness of breath'], severity: 'CRITICAL', triage_score: 92, arrival_time: '08:15 AM', booking_method: 'MOBILE_APP', status: 'WAITING' },
    { id: '2', patient_name: 'Mary Adhiambo', symptoms: ['High fever', 'Headache'], severity: 'HIGH', triage_score: 74, arrival_time: '08:30 AM', booking_method: 'USSD', status: 'WAITING' },
    { id: '3', patient_name: 'Peter Musa', symptoms: ['Cough', 'Runny nose'], severity: 'MEDIUM', triage_score: 45, arrival_time: '09:00 AM', booking_method: 'WHATSAPP', status: 'IN_PROGRESS', assigned_doctor: 'Dr. Kariuki' },
    { id: '4', patient_name: 'Jane Wanjiku', symptoms: ['Skin rash', 'Itching'], severity: 'LOW', triage_score: 22, arrival_time: '09:15 AM', booking_method: 'MOBILE_APP', status: 'WAITING' },
    { id: '5', patient_name: 'David Kamau', symptoms: ['Severe abdominal pain', 'Vomiting'], severity: 'HIGH', triage_score: 78, arrival_time: '09:30 AM', booking_method: 'HOSPITAL', status: 'WAITING' },
    { id: '6', patient_name: 'Grace Njeri', symptoms: ['Dizziness', 'Blurred vision'], severity: 'CRITICAL', triage_score: 88, arrival_time: '09:45 AM', booking_method: 'MOBILE_APP', status: 'WAITING' },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await getItem('auth_token');
      await fetch(`${API_BASE_URL}/hospital/triage-queue`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Update from API when backend returns data
    } catch {} finally {
      setRefreshing(false);
    }
  };

  const handleAssignDoctor = (patient: TriagePatient) => {
    Alert.alert(
      'Assign Doctor',
      `Assign a doctor to ${patient.patient_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Dr. Kariuki', onPress: () => Alert.alert('Assigned', `${patient.patient_name} assigned to Dr. Kariuki`) },
        { text: 'Dr. Omondi', onPress: () => Alert.alert('Assigned', `${patient.patient_name} assigned to Dr. Omondi`) },
        { text: 'Dr. Wanjiku', onPress: () => Alert.alert('Assigned', `${patient.patient_name} assigned to Dr. Wanjiku`) },
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#E53E3E';
      case 'HIGH': return '#D69E2E';
      case 'MEDIUM': return '#3182CE';
      case 'LOW': return '#38A169';
      default: return '#718096';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'WAITING': return { bg: '#FFF5F5', text: '#E53E3E' };
      case 'IN_PROGRESS': return { bg: '#FFFFF0', text: '#D69E2E' };
      case 'COMPLETED': return { bg: '#F0FFF4', text: '#38A169' };
      default: return { bg: '#EDF2F7', text: '#718096' };
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'MOBILE_APP': return '📱';
      case 'USSD': return '📞';
      case 'WHATSAPP': return '💬';
      case 'HOSPITAL': return '🏥';
      default: return '📋';
    }
  };

  const filtered = filter === 'ALL' ? patients : patients.filter(p => p.severity === filter);
  const sorted = [...filtered].sort((a, b) => b.triage_score - a.triage_score);

  const filters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Triage Queue</Text>
        <Text style={styles.headerSubtitle}>{patients.filter(p => p.status === 'WAITING').length} patients waiting</Text>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.activeChip]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeChipText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {sorted.map((patient) => {
          const statusStyle = getStatusStyle(patient.status);
          return (
            <View key={patient.id} style={styles.patientCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.patientName}>{patient.patient_name}</Text>
                    <Text style={styles.methodIcon}>{getMethodIcon(patient.booking_method)}</Text>
                  </View>
                  <Text style={styles.arrivalText}>Arrived: {patient.arrival_time}</Text>
                </View>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreText, { color: getSeverityColor(patient.severity) }]}>{patient.triage_score}</Text>
                </View>
              </View>

              {/* Severity & Status */}
              <View style={styles.badgeRow}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(patient.severity) + '20' }]}>
                  <View style={[styles.severityDot, { backgroundColor: getSeverityColor(patient.severity) }]} />
                  <Text style={[styles.severityText, { color: getSeverityColor(patient.severity) }]}>{patient.severity}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {patient.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {/* Symptoms */}
              <View style={styles.symptomsRow}>
                {patient.symptoms.map((s) => (
                  <View key={s} style={styles.symptomTag}>
                    <Text style={styles.symptomText}>{s}</Text>
                  </View>
                ))}
              </View>

              {/* Assigned doctor or action */}
              {patient.assigned_doctor ? (
                <Text style={styles.assignedText}>Assigned: {patient.assigned_doctor}</Text>
              ) : (
                <TouchableOpacity style={styles.assignButton} onPress={() => handleAssignDoctor(patient)}>
                  <Text style={styles.assignButtonText}>Assign Doctor</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#1A365D' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#FC8181', marginTop: 4, fontWeight: '600' },
  filterRow: { maxHeight: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterContent: { paddingHorizontal: 16, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EDF2F7', marginRight: 8 },
  activeChip: { backgroundColor: '#1A365D' },
  filterText: { fontSize: 13, color: '#4A5568', fontWeight: '600' },
  activeChipText: { color: '#FFF' },
  content: { padding: 16, paddingBottom: 32 },
  patientCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#1A365D', marginRight: 8 },
  methodIcon: { fontSize: 16 },
  arrivalText: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F7FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
  scoreText: { fontSize: 18, fontWeight: 'bold' },
  badgeRow: { flexDirection: 'row', marginBottom: 10 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  severityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  severityText: { fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  symptomTag: { backgroundColor: '#F7FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 4 },
  symptomText: { fontSize: 12, color: '#4A5568' },
  assignedText: { fontSize: 13, color: '#3182CE', fontWeight: '600' },
  assignButton: { backgroundColor: '#3182CE', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  assignButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});
