// File: app/book.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function BookAppointment() {
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Appointment</Text>
        <View style={{ width: 60 }} /> {/* Spacer to center the title */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Step 1: Select Specialist */}
        <Text style={styles.sectionTitle}>1. Select Specialist</Text>
        <View style={styles.card}>
          {['Dr. Sarah Kariuki (General)', 'Dr. Omondi (Pediatrics)', 'Dr. Wanjiku (Cardiology)'].map((doc) => (
            <TouchableOpacity 
              key={doc} 
              style={[styles.optionRow, selectedDoctor === doc && styles.selectedOption]}
              onPress={() => setSelectedDoctor(doc)}
            >
              <Text style={[styles.optionText, selectedDoctor === doc && styles.selectedOptionText]}>{doc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 2: Select Time */}
        <Text style={styles.sectionTitle}>2. Select Available Time</Text>
        <View style={styles.timeGrid}>
          {['09:00 AM', '10:30 AM', '01:00 PM', '03:15 PM'].map((time) => (
            <TouchableOpacity 
              key={time} 
              style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot]}
              onPress={() => setSelectedTime(time)}
            >
              <Text style={[styles.timeText, selectedTime === time && styles.selectedTimeText]}>{time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, (!selectedDoctor || !selectedTime) && styles.disabledButton]}
          disabled={!selectedDoctor || !selectedTime}
          onPress={() => {
            alert('Appointment Booked Successfully!');
            router.back();
          }}
        >
          <Text style={styles.submitButtonText}>Confirm Booking</Text>
        </TouchableOpacity>

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
  scrollContent: { padding: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 12, marginTop: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  optionRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F7FAFC', borderRadius: 8 },
  selectedOption: { backgroundColor: '#EBF8FF', borderColor: '#3182CE', borderWidth: 1 },
  optionText: { fontSize: 16, color: '#4A5568' },
  selectedOptionText: { color: '#2B6CB0', fontWeight: 'bold' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  timeSlot: { backgroundColor: '#FFFFFF', width: '48%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  selectedTimeSlot: { backgroundColor: '#3182CE' },
  timeText: { fontSize: 16, color: '#4A5568', fontWeight: '600' },
  selectedTimeText: { color: '#FFFFFF' },
  submitButton: { backgroundColor: '#3182CE', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  disabledButton: { backgroundColor: '#A0AEC0' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});