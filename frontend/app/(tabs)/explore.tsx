
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Alert,Linking } from 'react-native';

export default function Dashboard() {
  const router = useRouter();
  // FIX: Added ": string" to satisfy TypeScript
  const handlePress = (featureName: string) => {
    Alert.alert(`${featureName} Tapped!`, `We will build the ${featureName} screen next.`);
  };

  const openHeriBot = () => {
    // Replace this with the actual phone number to register for HeriBot (include country code, no +)
    const botNumber = "254757059907"; 
    const message = "Hello HeriBot! I need some assistance.";
    const url = `whatsapp://send?phone=${botNumber}&text=${message}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("WhatsApp Not Found", "Please install WhatsApp to chat with HeriBot.");
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
        <TouchableOpacity 
          style={{ backgroundColor: '#FFF5F5', borderWidth: 2, borderColor: '#FC8181', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 32 }} 
          onPress={() => router.push('/emergency')}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#E53E3E' }}>🚨 Request Emergency Ambulance</Text>
        </TouchableOpacity>

      </ScrollView>
      

      {/* Floating HeriBot WhatsApp Button */}
      <TouchableOpacity style={styles.fab} onPress={openHeriBot}>
        <Text style={styles.fabIcon}>💬</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}
  
  


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  scrollContent: { padding: 24 },
  header: { marginBottom: 32, marginTop: 40 },
  greeting: { fontSize: 16, color: '#4A5568' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#1A365D' },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 32 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  badge: { backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#319795', fontSize: 12, fontWeight: 'bold' },
  doctorName: { fontSize: 20, fontWeight: 'bold', color: '#1A365D', marginBottom: 4 },
  appointmentDetails: { fontSize: 14, color: '#4A5568', marginBottom: 12 },
  appointmentTime: { fontSize: 14, color: '#3182CE', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 16 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, alignItems: 'center', width: '30%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#2D3748' }
  fab: { position: 'absolute', bottom: 30, right: 24, backgroundColor: '#25D366', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  fabIcon: { fontSize: 30 }
});
