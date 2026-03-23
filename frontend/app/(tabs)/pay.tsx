// File: app/pay.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function PayBill() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('0757059907'); // Defaulting to the logged-in user's number
  const [isProcessing, setIsProcessing] = useState(false);
  const outstandingBalance = 5000;

  const handlePayment = async () => {
    // Basic validation
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert("Invalid Number", "Please enter a valid M-Pesa phone number.");
      return;
    }

    setIsProcessing(true);

    try {
      // Replace this with your actual local network IP or production URL
      // E.g., 'http://192.168.1.100:3000' or use process.env.EXPO_PUBLIC_API_URL
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://YOUR_BACKEND_IP:192.168.0.101'; 

      const response = await fetch(`${API_URL}/api/billing/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${userToken}`, // Uncomment and pass token if your route is protected
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          amount: outstandingBalance,
          // patientId: user.id // Pass other necessary data your backend expects
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "M-Pesa Prompt Sent", 
          `Check your phone (${phoneNumber}) to enter your M-Pesa PIN for Ksh ${outstandingBalance}.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        // Handle backend errors (e.g., invalid number format, server error)
        Alert.alert("Payment Failed", data.message || "Could not initiate payment. Please try again.");
      }
    } catch (error) {
      console.error("Payment API Error:", error);
      Alert.alert("Network Error", "Could not connect to the billing server. Please check your connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isProcessing}>
          <Text style={[styles.backText, isProcessing && { opacity: 0.5 }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Payments</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Outstanding Balance</Text>
          <Text style={styles.balanceAmount}>Ksh {outstandingBalance}</Text>
          <Text style={styles.balanceDetail}>General Consultation & Labs</Text>
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Pay via M-Pesa</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>M-Pesa Phone Number</Text>
          <TextInput 
            style={styles.input}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            editable={!isProcessing}
          />
        </View>

        {/* Pay Button */}
        <TouchableOpacity 
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]} 
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay Ksh {outstandingBalance}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureText}>🔒 Secured by HeriNjema Payments</Text>
      </View>

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
  balanceCard: { backgroundColor: '#1A365D', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  balanceLabel: { color: '#A0AEC0', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
  balanceDetail: { color: '#E2E8F0', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 16 },
  inputContainer: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  inputLabel: { fontSize: 12, color: '#718096', marginBottom: 8, fontWeight: '600' },
  input: { fontSize: 18, color: '#2D3748', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 8 },
  payButton: { backgroundColor: '#48BB78', padding: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#48BB78', shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  payButtonDisabled: { backgroundColor: '#A0AEC0', shadowOpacity: 0 },
  payButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  secureText: { textAlign: 'center', color: '#A0AEC0', marginTop: 24, fontSize: 12 }
});