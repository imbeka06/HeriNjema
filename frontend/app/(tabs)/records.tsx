// File: app/records.tsx
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function MedicalRecords() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Recent Lab Results */}
        <Text style={styles.sectionTitle}>Recent Test Results</Text>
        <View style={styles.card}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordTitle}>Complete Blood Count (CBC)</Text>
            <Text style={styles.recordDate}>Mar 15, 2026</Text>
          </View>
          <Text style={styles.statusTextNormal}>Status: Normal</Text>
          <TouchableOpacity style={styles.downloadButton}>
            <Text style={styles.downloadText}>↓ Download PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Past Appointments Timeline */}
        <Text style={styles.sectionTitle}>Visit History</Text>
        
        {/* Visit 1 */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.visitDate}>March 10, 2026</Text>
            <Text style={styles.visitDoctor}>Dr. Sarah Kariuki</Text>
            <Text style={styles.visitReason}>General Consultation - Flu symptoms</Text>
            <Text style={styles.prescriptionText}>Rx: Amoxicillin 500mg</Text>
          </View>
        </View>

        {/* Visit 2 */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.visitDate}>January 22, 2026</Text>
            <Text style={styles.visitDoctor}>Dr. Omondi</Text>
            <Text style={styles.visitReason}>Annual Physical Checkup</Text>
            <Text style={styles.prescriptionText}>Rx: None</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { padding: 8 },
  backText: { fontSize: 16, color: '#3182CE', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A365D' },
  content: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 16, marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 32 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recordTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A365D', flex: 1 },
  recordDate: { fontSize: 12, color: '#A0AEC0' },
  statusTextNormal: { color: '#38A169', fontWeight: '600', marginBottom: 16 },
  downloadButton: { backgroundColor: '#EDF2F7', padding: 12, borderRadius: 8, alignItems: 'center' },
  downloadText: { color: '#2B6CB0', fontWeight: 'bold' },
  timelineItem: { flexDirection: 'row', marginBottom: 24 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3182CE', marginTop: 6, marginRight: 16 },
  timelineContent: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  visitDate: { fontSize: 12, color: '#A0AEC0', marginBottom: 4, fontWeight: 'bold' },
  visitDoctor: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
  visitReason: { fontSize: 14, color: '#4A5568', marginBottom: 8 },
  prescriptionText: { fontSize: 14, color: '#3182CE', fontStyle: 'italic' }
});