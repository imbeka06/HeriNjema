// ============================================================================
// File: app/(tabs)/records.tsx
// Medical Records - FHIR-Integrated Health History
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { getItem } from '@/utils/secure-store';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface LabResult {
  id: string;
  test_name: string;
  date: string;
  status: 'Normal' | 'Abnormal' | 'Critical';
  value: string;
  reference_range: string;
}

interface Visit {
  id: string;
  date: string;
  doctor: string;
  reason: string;
  prescription: string;
  diagnosis: string;
}

interface Allergy {
  id: string;
  substance: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

export default function MedicalRecords() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'results' | 'visits' | 'allergies'>('results');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [labResults] = useState<LabResult[]>([
    { id: '1', test_name: 'Complete Blood Count (CBC)', date: 'Mar 15, 2026', status: 'Normal', value: 'WBC: 7.2 x10³/µL', reference_range: '4.5-11.0' },
    { id: '2', test_name: 'Blood Glucose (Fasting)', date: 'Mar 15, 2026', status: 'Normal', value: '92 mg/dL', reference_range: '70-100' },
    { id: '3', test_name: 'Malaria Parasite Test', date: 'Feb 28, 2026', status: 'Abnormal', value: 'Positive (P. falciparum)', reference_range: 'Negative' },
    { id: '4', test_name: 'HIV Rapid Test', date: 'Jan 10, 2026', status: 'Normal', value: 'Non-Reactive', reference_range: 'Non-Reactive' },
  ]);

  const [visits] = useState<Visit[]>([
    { id: '1', date: 'March 10, 2026', doctor: 'Dr. Sarah Kariuki', reason: 'General Consultation - Flu symptoms', prescription: 'Amoxicillin 500mg x7 days', diagnosis: 'Upper respiratory infection' },
    { id: '2', date: 'February 28, 2026', doctor: 'Dr. Omondi', reason: 'Malaria Treatment', prescription: 'Artemether-Lumefantrine (AL) x3 days', diagnosis: 'Uncomplicated P. falciparum malaria' },
    { id: '3', date: 'January 22, 2026', doctor: 'Dr. Wanjiku', reason: 'Annual Physical Checkup', prescription: 'None', diagnosis: 'Healthy - no concerns' },
  ]);

  const [allergies] = useState<Allergy[]>([
    { id: '1', substance: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' },
    { id: '2', substance: 'Sulfonamides', severity: 'moderate', reaction: 'Skin rash' },
    { id: '3', substance: 'Dust mites', severity: 'mild', reaction: 'Sneezing, runny nose' },
  ]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = await getItem('auth_token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/fhir/patient/records`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // Update state with FHIR data when available
      }
    } catch {
      // Fall back to local mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const getStatusColor = (status: string) => {
    if (status === 'Normal') return '#38A169';
    if (status === 'Abnormal') return '#D69E2E';
    return '#E53E3E';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'mild') return '#38A169';
    if (severity === 'moderate') return '#D69E2E';
    return '#E53E3E';
  };

  const tabs = [
    { key: 'results' as const, label: '🧪 Lab Results' },
    { key: 'visits' as const, label: '🏥 Visits' },
    { key: 'allergies' as const, label: '⚠️ Allergies' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <Text style={styles.headerSubtitle}>FHIR-synced health data</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} tintColor="#3182CE" />}
      >
        {loading && !refreshing && (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 40 }} />
        )}

        {activeTab === 'results' && !loading && labResults.map((result) => (
          <View key={result.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{result.test_name}</Text>
              <Text style={styles.cardDate}>{result.date}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultValue}>{result.value}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(result.status) }]}>{result.status}</Text>
              </View>
            </View>
            <Text style={styles.referenceText}>Reference: {result.reference_range}</Text>
          </View>
        ))}

        {activeTab === 'visits' && !loading && visits.map((visit) => (
          <View key={visit.id} style={styles.visitCard}>
            <View style={styles.timelineDot} />
            <View style={styles.visitContent}>
              <Text style={styles.visitDate}>{visit.date}</Text>
              <Text style={styles.visitDoctor}>{visit.doctor}</Text>
              <Text style={styles.visitReason}>{visit.reason}</Text>
              <View style={styles.diagnosisRow}>
                <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
                <Text style={styles.diagnosisText}>{visit.diagnosis}</Text>
              </View>
              <Text style={styles.prescriptionText}>Rx: {visit.prescription}</Text>
            </View>
          </View>
        ))}

        {activeTab === 'allergies' && !loading && (
          <View>
            <View style={styles.allergyWarning}>
              <Text style={styles.allergyWarningText}>⚠️ Share this list with any new healthcare provider</Text>
            </View>
            {allergies.map((allergy) => (
              <View key={allergy.id} style={styles.allergyCard}>
                <View style={styles.allergyHeader}>
                  <Text style={styles.allergyName}>{allergy.substance}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(allergy.severity) + '20' }]}>
                    <Text style={[styles.severityText, { color: getSeverityColor(allergy.severity) }]}>{allergy.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.reactionText}>Reaction: {allergy.reaction}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#1A365D' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#A0CDF4', marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#3182CE' },
  tabText: { fontSize: 13, color: '#718096', fontWeight: '600' },
  activeTabText: { color: '#3182CE' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A365D', flex: 1 },
  cardDate: { fontSize: 12, color: '#A0AEC0' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultValue: { fontSize: 14, color: '#2D3748', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  referenceText: { fontSize: 12, color: '#A0AEC0' },
  visitCard: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3182CE', marginTop: 6, marginRight: 16 },
  visitContent: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  visitDate: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold', marginBottom: 4 },
  visitDoctor: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
  visitReason: { fontSize: 14, color: '#4A5568', marginBottom: 8 },
  diagnosisRow: { flexDirection: 'row', marginBottom: 8 },
  diagnosisLabel: { fontSize: 13, color: '#718096', marginRight: 4 },
  diagnosisText: { fontSize: 13, color: '#2D3748', fontWeight: '600', flex: 1 },
  prescriptionText: { fontSize: 14, color: '#3182CE', fontStyle: 'italic' },
  allergyWarning: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F6E05E' },
  allergyWarningText: { fontSize: 14, color: '#975A16', fontWeight: '600', textAlign: 'center' },
  allergyCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  allergyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  allergyName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  severityText: { fontSize: 11, fontWeight: 'bold' },
  reactionText: { fontSize: 14, color: '#4A5568' },
});
