// ============================================================================
// File: app/(tabs)/book.tsx
// Book Appointment Screen - HeriBot AI Triage + Backend Booking
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { getItem } from '@/utils/secure-store';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface TriageResult {
  severity: string;
  recommendation: string;
  suggested_specialist: string;
  confidence: number;
}

export default function BookAppointment() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState('');
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const availableDoctors = [
    'Dr. Sarah Kariuki (General)',
    'Dr. Omondi (Pediatrics)',
    'Dr. Wanjiku (Cardiology)',
    'Dr. Njeri (Dermatology)',
  ];

  const timeSlots = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '03:15 PM', '04:00 PM'];

  const handleTriage = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Required', 'Please describe your symptoms');
      return;
    }
    setTriageLoading(true);
    try {
      const token = await getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/heribot/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ symptoms: symptoms.split(',').map(s => s.trim()) }),
      });
      const data = await response.json();
      if (data.success) {
        setTriageResult(data.triage);
        setStep(2);
      } else {
        Alert.alert('Triage Error', data.message || 'Could not analyze symptoms');
      }
    } catch {
      Alert.alert('Network Error', 'Could not connect to HeriBot. Proceeding to manual booking.');
      setTriageResult({ severity: 'unknown', recommendation: 'Manual booking', suggested_specialist: '', confidence: 0 });
      setStep(2);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDoctor || !selectedTime) return;
    setBookingLoading(true);
    try {
      const token = await getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          doctor: selectedDoctor,
          time_slot: selectedTime,
          symptoms,
          triage_severity: triageResult?.severity,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Booked!', `Appointment confirmed with ${selectedDoctor} at ${selectedTime}`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Could not book appointment');
      }
    } catch {
      Alert.alert('Network Error', 'Could not connect to server');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <Text style={styles.stepText}>Step {step}/3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>🤖 HeriBot AI Triage</Text>
            <Text style={styles.subtitle}>Describe your symptoms for smart routing</Text>
            <TextInput
              style={styles.symptomsInput}
              placeholder="e.g. headache, fever, chest pain"
              placeholderTextColor="#A0AEC0"
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[styles.primaryButton, triageLoading && styles.disabledButton]}
              onPress={handleTriage}
              disabled={triageLoading}
            >
              {triageLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Analyze Symptoms</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={() => { setTriageResult(null); setStep(2); }}>
              <Text style={styles.skipText}>Skip triage → Book directly</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            {triageResult && triageResult.severity !== 'unknown' && (
              <View style={styles.triageCard}>
                <Text style={styles.triageTitle}>AI Assessment</Text>
                <View style={styles.triageRow}>
                  <Text style={styles.triageLabel}>Severity:</Text>
                  <View style={[styles.severityBadge,
                    { backgroundColor: triageResult.severity === 'high' ? '#FED7D7' : triageResult.severity === 'medium' ? '#FEFCBF' : '#C6F6D5' }
                  ]}>
                    <Text style={styles.severityText}>{triageResult.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.triageRecommendation}>{triageResult.recommendation}</Text>
                {triageResult.suggested_specialist ? (
                  <Text style={styles.suggestedSpecialist}>Suggested: {triageResult.suggested_specialist}</Text>
                ) : null}
              </View>
            )}

            <Text style={styles.sectionTitle}>Select Doctor</Text>
            <View style={styles.card}>
              {availableDoctors.map((doc) => (
                <TouchableOpacity
                  key={doc}
                  style={[styles.optionRow, selectedDoctor === doc && styles.selectedOption]}
                  onPress={() => setSelectedDoctor(doc)}
                >
                  <Text style={[styles.optionText, selectedDoctor === doc && styles.selectedOptionText]}>{doc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, !selectedDoctor && styles.disabledButton]}
              disabled={!selectedDoctor}
              onPress={() => setStep(3)}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Select Time Slot</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.timeText, selectedTime === time && styles.selectedTimeText]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <Text style={styles.summaryItem}>Doctor: {selectedDoctor}</Text>
              <Text style={styles.summaryItem}>Time: {selectedTime || 'Not selected'}</Text>
              <Text style={styles.summaryItem}>Symptoms: {symptoms || 'None specified'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, (!selectedTime || bookingLoading) && styles.disabledButton]}
              disabled={!selectedTime || bookingLoading}
              onPress={handleBooking}
            >
              {bookingLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backText: { fontSize: 16, color: '#3182CE', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A365D' },
  stepText: { fontSize: 14, color: '#A0AEC0' },
  scrollContent: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 14, color: '#718096', marginBottom: 16 },
  symptomsInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, color: '#2D3748', minHeight: 100, textAlignVertical: 'top', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  primaryButton: { backgroundColor: '#3182CE', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#A0AEC0' },
  skipButton: { alignItems: 'center', marginTop: 16 },
  skipText: { color: '#718096', fontSize: 14 },
  triageCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#3182CE', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  triageTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A365D', marginBottom: 12 },
  triageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  triageLabel: { fontSize: 14, color: '#4A5568', marginRight: 8 },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  severityText: { fontSize: 12, fontWeight: 'bold', color: '#2D3748' },
  triageRecommendation: { fontSize: 14, color: '#4A5568', marginTop: 8, lineHeight: 20 },
  suggestedSpecialist: { fontSize: 14, color: '#3182CE', fontWeight: '600', marginTop: 8 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 16 },
  optionRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F7FAFC', borderRadius: 8 },
  selectedOption: { backgroundColor: '#EBF8FF', borderColor: '#3182CE', borderWidth: 1 },
  optionText: { fontSize: 16, color: '#4A5568' },
  selectedOptionText: { color: '#2B6CB0', fontWeight: 'bold' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  timeSlot: { backgroundColor: '#FFF', width: '48%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  selectedTimeSlot: { backgroundColor: '#3182CE' },
  timeText: { fontSize: 16, color: '#4A5568', fontWeight: '600' },
  selectedTimeText: { color: '#FFF' },
  summaryCard: { backgroundColor: '#EBF8FF', padding: 20, borderRadius: 16, marginTop: 24, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A365D', marginBottom: 12 },
  summaryItem: { fontSize: 14, color: '#4A5568', marginBottom: 4 },
  confirmButton: { backgroundColor: '#48BB78', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
