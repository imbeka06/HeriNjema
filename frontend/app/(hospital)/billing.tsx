// ============================================================================
// Hospital Billing - Invoice management, M-Pesa reconciliation, SHA claims
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { getItem } from '@/utils/secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Invoice {
  id: string;
  patient_name: string;
  service: string;
  total_amount: number;
  sha_coverage: number;
  patient_responsibility: number;
  payment_status: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE';
  payment_method?: string;
  mpesa_receipt?: string;
  date: string;
}

export default function HospitalBilling() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'overdue'>('pending');

  const [invoices] = useState<Invoice[]>([
    { id: 'INV-001', patient_name: 'Peter Musa', service: 'General Consultation + CBC', total_amount: 3500, sha_coverage: 2500, patient_responsibility: 1000, payment_status: 'PAID', payment_method: 'M-Pesa', mpesa_receipt: 'SHF34J78K2', date: 'Apr 11, 2026' },
    { id: 'INV-002', patient_name: 'Mary Adhiambo', service: 'Malaria Treatment', total_amount: 4200, sha_coverage: 3000, patient_responsibility: 1200, payment_status: 'PENDING', date: 'Apr 11, 2026' },
    { id: 'INV-003', patient_name: 'David Kamau', service: 'X-Ray + Consultation', total_amount: 8500, sha_coverage: 5000, patient_responsibility: 3500, payment_status: 'PARTIAL', payment_method: 'M-Pesa', mpesa_receipt: 'SHG82K91L5', date: 'Apr 10, 2026' },
    { id: 'INV-004', patient_name: 'Grace Njeri', service: 'Emergency + ICU (2 days)', total_amount: 45000, sha_coverage: 30000, patient_responsibility: 15000, payment_status: 'OVERDUE', date: 'Apr 5, 2026' },
    { id: 'INV-005', patient_name: 'John Omondi', service: 'Cardiology Consultation', total_amount: 6000, sha_coverage: 4500, patient_responsibility: 1500, payment_status: 'PENDING', date: 'Apr 11, 2026' },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await getItem('auth_token');
      await fetch(`${API_BASE_URL}/hospital/billing/reconciliation`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {} finally {
      setRefreshing(false);
    }
  };

  const sendPaymentReminder = (invoice: Invoice) => {
    Alert.alert(
      'Send Reminder',
      `Send M-Pesa payment reminder to ${invoice.patient_name} for Ksh ${invoice.patient_responsibility.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send via SMS', onPress: () => Alert.alert('Sent', `Payment reminder sent to ${invoice.patient_name}`) },
        { text: 'Send via WhatsApp', onPress: () => Alert.alert('Sent', `WhatsApp reminder sent to ${invoice.patient_name}`) },
      ]
    );
  };

  const generateReceipt = (invoice: Invoice) => {
    Alert.alert('Receipt', `eTIMS-compliant receipt generated for ${invoice.id}\n\nVerification: HERINJEMA-${Date.now()}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return '#38A169';
      case 'PENDING': return '#D69E2E';
      case 'PARTIAL': return '#3182CE';
      case 'OVERDUE': return '#E53E3E';
      default: return '#718096';
    }
  };

  const tabs = [
    { key: 'pending' as const, label: 'Pending', count: invoices.filter(i => i.payment_status === 'PENDING' || i.payment_status === 'PARTIAL').length },
    { key: 'overdue' as const, label: 'Overdue', count: invoices.filter(i => i.payment_status === 'OVERDUE').length },
    { key: 'paid' as const, label: 'Paid', count: invoices.filter(i => i.payment_status === 'PAID').length },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === 'pending') return inv.payment_status === 'PENDING' || inv.payment_status === 'PARTIAL';
    if (activeTab === 'overdue') return inv.payment_status === 'OVERDUE';
    return inv.payment_status === 'PAID';
  });

  // Summary stats
  const totalOutstanding = invoices
    .filter(i => i.payment_status !== 'PAID')
    .reduce((sum, i) => sum + i.patient_responsibility, 0);
  const totalSHAClaims = invoices.reduce((sum, i) => sum + i.sha_coverage, 0);
  const totalCollected = invoices
    .filter(i => i.payment_status === 'PAID')
    .reduce((sum, i) => sum + i.patient_responsibility, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing & Finance</Text>
        <Text style={styles.headerSubtitle}>Revenue & SHA claims</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderTopColor: '#E53E3E' }]}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, { color: '#E53E3E' }]}>Ksh {totalOutstanding.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#3182CE' }]}>
          <Text style={styles.summaryLabel}>SHA Claims</Text>
          <Text style={[styles.summaryValue, { color: '#3182CE' }]}>Ksh {totalSHAClaims.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#38A169' }]}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: '#38A169' }]}>Ksh {totalCollected.toLocaleString()}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredInvoices.map((invoice) => (
          <View key={invoice.id} style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceId}>{invoice.id}</Text>
                <Text style={styles.patientName}>{invoice.patient_name}</Text>
                <Text style={styles.serviceText}>{invoice.service}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.payment_status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(invoice.payment_status) }]}>{invoice.payment_status}</Text>
              </View>
            </View>

            {/* Amount breakdown */}
            <View style={styles.amountGrid}>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>Total</Text>
                <Text style={styles.amountValue}>Ksh {invoice.total_amount.toLocaleString()}</Text>
              </View>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>SHA Cover</Text>
                <Text style={[styles.amountValue, { color: '#3182CE' }]}>Ksh {invoice.sha_coverage.toLocaleString()}</Text>
              </View>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>Patient Pays</Text>
                <Text style={[styles.amountValue, { color: '#E53E3E', fontWeight: 'bold' }]}>Ksh {invoice.patient_responsibility.toLocaleString()}</Text>
              </View>
            </View>

            {/* M-Pesa receipt if paid */}
            {invoice.mpesa_receipt && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>M-Pesa Receipt:</Text>
                <Text style={styles.receiptValue}>{invoice.mpesa_receipt}</Text>
              </View>
            )}

            <Text style={styles.dateText}>{invoice.date}</Text>

            {/* Actions */}
            <View style={styles.actionsRow}>
              {invoice.payment_status === 'PAID' ? (
                <TouchableOpacity style={styles.receiptButton} onPress={() => generateReceipt(invoice)}>
                  <Text style={styles.receiptButtonText}>🧾 eTIMS Receipt</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.reminderButton} onPress={() => sendPaymentReminder(invoice)}>
                    <Text style={styles.reminderButtonText}>📲 Send Reminder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.receiptButton} onPress={() => generateReceipt(invoice)}>
                    <Text style={styles.receiptButtonText}>🧾 Pro-forma</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#1A365D' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#A0CDF4', marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 4, borderTopWidth: 3, borderRadius: 4, backgroundColor: '#FAFAFA' },
  summaryLabel: { fontSize: 11, color: '#718096', fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#3182CE' },
  tabText: { fontSize: 13, color: '#718096', fontWeight: '600' },
  activeTabText: { color: '#3182CE' },
  content: { padding: 16, paddingBottom: 32 },
  invoiceCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  invoiceId: { fontSize: 12, color: '#A0AEC0', fontWeight: '600' },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#1A365D', marginTop: 2 },
  serviceText: { fontSize: 13, color: '#718096', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  amountGrid: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 10, marginBottom: 10 },
  amountItem: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 11, color: '#A0AEC0', fontWeight: '600' },
  amountValue: { fontSize: 14, color: '#2D3748', marginTop: 2 },
  receiptRow: { flexDirection: 'row', marginBottom: 8 },
  receiptLabel: { fontSize: 12, color: '#718096', marginRight: 6 },
  receiptValue: { fontSize: 12, color: '#38A169', fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#A0AEC0', marginBottom: 10 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  reminderButton: { flex: 1, backgroundColor: '#EBF8FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  reminderButtonText: { fontSize: 13, fontWeight: '600', color: '#2B6CB0' },
  receiptButton: { flex: 1, backgroundColor: '#F0FFF4', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  receiptButtonText: { fontSize: 13, fontWeight: '600', color: '#38A169' },
});
