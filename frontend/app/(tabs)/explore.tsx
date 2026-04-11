// ============================================================================
// File: app/(tabs)/explore.tsx
// Explore Hospitals - Search & Filter Nearby Facilities
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Hospital {
  id: string;
  name: string;
  type: string;
  distance: string;
  rating: number;
  address: string;
  phone: string;
  services: string[];
  sha_accepted: boolean;
  open_now: boolean;
}

const MOCK_HOSPITALS: Hospital[] = [
  { id: '1', name: 'Kenyatta National Hospital', type: 'Public', distance: '2.3 km', rating: 4.5, address: 'Hospital Rd, Nairobi', phone: '+254202726300', services: ['Emergency', 'Surgery', 'Pediatrics', 'Cardiology'], sha_accepted: true, open_now: true },
  { id: '2', name: 'Nairobi Hospital', type: 'Private', distance: '3.1 km', rating: 4.7, address: 'Argwings Kodhek Rd', phone: '+254202845000', services: ['Emergency', 'Oncology', 'Maternity', 'ICU'], sha_accepted: true, open_now: true },
  { id: '3', name: 'Mbagathi Hospital', type: 'Public', distance: '5.6 km', rating: 3.9, address: 'Mbagathi Way', phone: '+254202725272', services: ['Emergency', 'General', 'TB Clinic', 'Dental'], sha_accepted: true, open_now: true },
  { id: '4', name: 'Aga Khan University Hospital', type: 'Private', distance: '4.2 km', rating: 4.8, address: '3rd Parklands Ave', phone: '+254203662000', services: ['Emergency', 'Cardiology', 'Neurology', 'Radiology'], sha_accepted: false, open_now: true },
  { id: '5', name: 'Mama Lucy Kibaki Hospital', type: 'Public', distance: '8.1 km', rating: 3.7, address: 'Kangundo Rd, Embakasi', phone: '+254204441999', services: ['Emergency', 'Maternity', 'Pediatrics'], sha_accepted: true, open_now: false },
];

type FilterType = 'all' | 'public' | 'private' | 'sha' | 'open';

export default function ExploreHospitals() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'public', label: 'Public' },
    { key: 'private', label: 'Private' },
    { key: 'sha', label: 'SHA/NHIF' },
    { key: 'open', label: 'Open Now' },
  ];

  const filteredHospitals = MOCK_HOSPITALS.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (activeFilter === 'public') return h.type === 'Public';
    if (activeFilter === 'private') return h.type === 'Private';
    if (activeFilter === 'sha') return h.sha_accepted;
    if (activeFilter === 'open') return h.open_now;
    return true;
  });

  const callHospital = (phone: string, name: string) => {
    Alert.alert('Call Hospital', `Call ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Hospitals</Text>
        <Text style={styles.headerSubtitle}>Find care near you</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search hospitals or services..."
          placeholderTextColor="#A0AEC0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.activeFilterChip]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.activeFilterText]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.resultCount}>{filteredHospitals.length} hospitals found</Text>

        {filteredHospitals.map((hospital) => (
          <View key={hospital.id} style={styles.hospitalCard}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hospitalName}>{hospital.name}</Text>
                <Text style={styles.hospitalAddress}>{hospital.address}</Text>
              </View>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{hospital.distance}</Text>
              </View>
            </View>

            <View style={styles.cardMeta}>
              <View style={[styles.typeBadge, { backgroundColor: hospital.type === 'Public' ? '#E6FFFA' : '#EBF8FF' }]}>
                <Text style={[styles.typeText, { color: hospital.type === 'Public' ? '#319795' : '#2B6CB0' }]}>{hospital.type}</Text>
              </View>
              {hospital.sha_accepted && (
                <View style={styles.shaBadge}>
                  <Text style={styles.shaText}>SHA ✓</Text>
                </View>
              )}
              <View style={[styles.statusDot, { backgroundColor: hospital.open_now ? '#48BB78' : '#E53E3E' }]} />
              <Text style={styles.statusText}>{hospital.open_now ? 'Open' : 'Closed'}</Text>
            </View>

            <Text style={styles.ratingText}>{renderStars(hospital.rating)} {hospital.rating}</Text>

            <View style={styles.servicesRow}>
              {hospital.services.slice(0, 3).map((s) => (
                <View key={s} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{s}</Text>
                </View>
              ))}
              {hospital.services.length > 3 && (
                <Text style={styles.moreServices}>+{hospital.services.length - 3}</Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.callButton} onPress={() => callHospital(hospital.phone, hospital.name)}>
                <Text style={styles.callButtonText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bookButton} onPress={() => router.push('/book')}>
                <Text style={styles.bookButtonText}>📅 Book</Text>
              </TouchableOpacity>
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
  searchContainer: { padding: 16, paddingTop: 12, backgroundColor: '#1A365D', paddingBottom: 16 },
  searchInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, color: '#2D3748' },
  filterRow: { maxHeight: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterContent: { paddingHorizontal: 16, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EDF2F7', marginRight: 8 },
  activeFilterChip: { backgroundColor: '#3182CE' },
  filterText: { fontSize: 14, color: '#4A5568', fontWeight: '600' },
  activeFilterText: { color: '#FFF' },
  listContent: { padding: 16 },
  resultCount: { fontSize: 14, color: '#718096', marginBottom: 12 },
  hospitalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  hospitalName: { fontSize: 18, fontWeight: 'bold', color: '#1A365D' },
  hospitalAddress: { fontSize: 13, color: '#718096', marginTop: 2 },
  distanceBadge: { backgroundColor: '#EBF8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  distanceText: { fontSize: 12, fontWeight: 'bold', color: '#2B6CB0' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  typeText: { fontSize: 12, fontWeight: 'bold' },
  shaBadge: { backgroundColor: '#F0FFF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
  shaText: { fontSize: 11, fontWeight: 'bold', color: '#38A169' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  statusText: { fontSize: 12, color: '#718096' },
  ratingText: { fontSize: 14, color: '#D69E2E', marginBottom: 8 },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  serviceTag: { backgroundColor: '#F7FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  serviceTagText: { fontSize: 11, color: '#4A5568' },
  moreServices: { fontSize: 11, color: '#A0AEC0', alignSelf: 'center', marginLeft: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  callButton: { flex: 1, backgroundColor: '#EDF2F7', padding: 12, borderRadius: 10, alignItems: 'center', marginRight: 8 },
  callButtonText: { fontSize: 14, fontWeight: 'bold', color: '#2D3748' },
  bookButton: { flex: 1, backgroundColor: '#3182CE', padding: 12, borderRadius: 10, alignItems: 'center', marginLeft: 8 },
  bookButtonText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
});
