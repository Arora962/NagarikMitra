/**
 * App.js
 * Decorated home screen for NagrikMitra prototype (Civic Issue Reporting)
 *
 * Make sure required native packages are installed:
 *  - @react-native-async-storage/async-storage
 *  - react-native-image-picker
 *  - @react-native-community/geolocation
 *  - react-native-safe-area-context
 *
 * Paste this as App.js and run.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const REPORTS_KEY = 'CIVIC_REPORTS';

/** Helper small UI components **/
const Chip = ({ children, style }) => (
  <View style={[styles.chip, style]}>
    <Text style={styles.chipText}>{children}</Text>
  </View>
);

const Header = ({ mode, setMode, total }) => (
  <View style={styles.header}>
    <View>
      <Text style={styles.appTitle}>NagrikMitra</Text>
      <Text style={styles.appTag}>Report. Resolve. Rebuild.</Text>
    </View>

    <View style={styles.headerRight}>
      <Text style={styles.reportsCount}>{total}</Text>
      <Text style={styles.reportsLabel}>Reports</Text>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'citizen' && styles.modeBtnActive]}
          onPress={() => setMode('citizen')}
        >
          <Text style={[styles.modeBtnText, mode === 'citizen' && styles.modeBtnTextActive]}>Citizen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'admin' && styles.modeBtnActive]}
          onPress={() => setMode('admin')}
        >
          <Text style={[styles.modeBtnText, mode === 'admin' && styles.modeBtnTextActive]}>Admin</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/** Main App **/
const App = () => {
  const [photoUri, setPhotoUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('citizen'); // 'citizen' | 'admin'
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await AsyncStorage.getItem(REPORTS_KEY);
      if (data) setReports(JSON.parse(data));
    } catch (e) {
      console.warn('Failed to load reports:', e);
    }
  };

  const saveReports = async (newReports) => {
    try {
      setReports(newReports);
      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(newReports));
    } catch (e) {
      console.warn('Failed to save reports:', e);
    }
  };

  const handlePickImage = async () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Image error');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setPhotoUri(response.assets[0].uri || null);
      }
    });
  };

  const handleTakePhoto = async () => {
    launchCamera({ mediaType: 'photo', quality: 0.7 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Camera error');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setPhotoUri(response.assets[0].uri || null);
      }
    });
  };

  const handleGetLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        Alert.alert('Location Error', err.message || 'Unable to get location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  };

  const handleSubmit = async () => {
    if (!photoUri || !location || !description.trim()) {
      Alert.alert('Incomplete', 'Please add a photo, capture location, and enter a description.');
      return;
    }
    const newReport = {
      id: Date.now().toString(),
      photoUri,
      location,
      description,
      createdAt: new Date().toISOString(),
      status: 'Reported',
      department: 'Unassigned',
    };
    const newReports = [newReport, ...reports];
    await saveReports(newReports);
    setPhotoUri(null);
    setLocation(null);
    setDescription('');
    Alert.alert('Submitted', 'Report submitted — thank you for helping your city.');
  };

  const advanceStatus = async (id) => {
    const order = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
    const updated = reports.map((r) => {
      if (r.id === id) {
        const idx = order.indexOf(r.status || 'Reported');
        const next = order[Math.min(idx + 1, order.length - 1)];
        return { ...r, status: next };
      }
      return r;
    });
    await saveReports(updated);
  };

  const assignDept = async (id, dept) => {
    const updated = reports.map((r) => (r.id === id ? { ...r, department: dept } : r));
    await saveReports(updated);
  };

  const deleteReport = async (id) => {
    Alert.alert('Delete report', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = reports.filter((r) => r.id !== id);
          await saveReports(updated);
        },
      },
    ]);
  };

  const filteredReports = reports.filter((r) => (filter === 'All' ? true : r.status === filter));

  const renderReport = ({ item }) => (
    <View style={styles.reportItem}>
      <Image source={{ uri: item.photoUri }} style={styles.reportImage} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.reportDesc} numberOfLines={2}>{item.description}</Text>
          <Chip style={{ backgroundColor: '#e9eef8' }}>{item.status || 'Reported'}</Chip>
        </View>
        <Text style={styles.reportMeta}>
          Dept: {item.department} • {new Date(item.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.reportMeta}>
          Location: {item.location?.latitude.toFixed(4)}, {item.location?.longitude.toFixed(4)}
        </Text>

        {mode === 'admin' ? (
          <View style={styles.reportActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => advanceStatus(item.id)}>
              <Text style={styles.actionBtnText}>Advance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#f0f0f0' }]}
              onPress={() => {
                // simple prompt replacement for all platforms
                Alert.prompt && Alert.prompt('Assign Department', 'Enter department', (txt) => {
                  if (txt && txt.trim()) assignDept(item.id, txt.trim());
                });
                if (!Alert.prompt) {
                  // fallback: assign 'Public Works'
                  assignDept(item.id, 'Public Works');
                  Alert.alert('Assigned', 'Assigned to Public Works');
                }
              }}
            >
              <Text style={[styles.actionBtnText, { color: '#333' }]}>Assign</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ffefef' }]} onPress={() => deleteReport(item.id)}>
              <Text style={[styles.actionBtnText, { color: '#c00' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Header mode={mode} setMode={setMode} total={reports.length} />

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Citizen Form */}
          {mode === 'citizen' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Report an Issue</Text>

              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                  <Text style={styles.photoBtnText}>📸 Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                  <Text style={styles.photoBtnText}>🖼️ Pick from Gallery</Text>
                </TouchableOpacity>
              </View>

              {photoUri ? <Image source={{ uri: photoUri }} style={styles.previewImage} /> : (
                <View style={styles.previewPlaceholder}>
                  <Text style={{ color: '#888' }}>No photo selected</Text>
                </View>
              )}

              <TouchableOpacity style={styles.locBtn} onPress={handleGetLocation} disabled={loading}>
                <Text style={styles.locBtnText}>
                  {location ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : loading ? 'Getting location...' : '📍 Capture Location'}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Describe the issue (location/impact)..."
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Admin: quick stats + map placeholder + filters
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Admin Dashboard</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>Total reports</Text>
                  <Text style={{ fontSize: 22, marginTop: 6 }}>{reports.length}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>Resolved</Text>
                  <Text style={{ fontSize: 22, marginTop: 6 }}>{reports.filter((r) => r.status === 'Resolved').length}</Text>
                </View>
              </View>

              <View style={styles.mapPlaceholder}>
                <Text style={{ color: '#666' }}>Map placeholder (interactive map can be plugged here)</Text>
              </View>

              <View style={styles.filterRow}>
                {['All', 'Reported', 'Acknowledged', 'In Progress', 'Resolved'].map((f) => (
                  <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
                    <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Submitted reports list */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Submitted Reports</Text>
            {filteredReports.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: '#777' }}>No reports match this filter.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredReports}
                renderItem={renderReport}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 120 }}
                scrollEnabled={false} // inside ScrollView; keep it simple for demo
              />
            )}
          </View>
        </ScrollView>

        {/* Floating Quick Actions */}
        <View style={styles.fabRow}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              // Quick demo helper: seed a fake report
              const seed = {
                id: Date.now().toString(),
                photoUri: 'https://placehold.co/600x400/png',
                location: { latitude: 23.6102, longitude: 85.2799 },
                description: 'Demo: pothole near main road',
                createdAt: new Date().toISOString(),
                status: 'Reported',
                department: 'Public Works',
              };
              saveReports([seed, ...reports]);
            }}
          >
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }]}
            onPress={() => {
              // clear all reports (for demo)
              Alert.alert('Clear all', 'Remove all stored reports?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => { await saveReports([]); } },
              ]);
            }}
          >
            <Text style={[styles.fabText, { color: '#333' }]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f6fb' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: { fontSize: 20, fontWeight: '700', color: '#1f4f82' },
  appTag: { color: '#5b6b7a', fontSize: 12 },
  headerRight: { alignItems: 'flex-end' },
  reportsCount: { fontSize: 18, fontWeight: '700', color: '#1f4f82' },
  reportsLabel: { fontSize: 12, color: '#718096' },
  modeToggle: { marginTop: 8, flexDirection: 'row', borderRadius: 8, overflow: 'hidden' },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f4f7fb' },
  modeBtnActive: { backgroundColor: '#1f4f82' },
  modeBtnText: { color: '#1f4f82', fontWeight: '600' },
  modeBtnTextActive: { color: '#fff' },

  container: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#1f4f82' },

  photoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  photoBtn: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 10,
    backgroundColor: '#eef6ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  photoBtnText: { color: '#205a9a', fontWeight: '600' },

  previewImage: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  previewPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  locBtn: {
    padding: 10,
    backgroundColor: '#fff6ea',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0e6c8',
    alignItems: 'center',
    marginBottom: 8,
  },
  locBtnText: { color: '#8a5a00', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#e6eef7',
    borderRadius: 8,
    padding: 10,
    minHeight: 72,
    backgroundColor: '#fbfdff',
    marginBottom: 10,
    textAlignVertical: 'top',
  },

  submitBtn: {
    backgroundColor: '#1f4f82',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f4f82', marginBottom: 8 },

  reportItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    elevation: 1,
  },
  reportImage: { width: 78, height: 64, borderRadius: 8, backgroundColor: '#eee' },
  reportDesc: { fontSize: 15, fontWeight: '600', color: '#233d55', flex: 1 },
  reportMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  reportActions: { flexDirection: 'row', marginTop: 8 },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#1f4f82',
    borderRadius: 8,
    marginRight: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600' },

  chip: {
    backgroundColor: '#dfeeff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  chipText: { color: '#11407a', fontWeight: '700', fontSize: 12 },

  mapPlaceholder: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eef7',
    backgroundColor: '#fbfdff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f6f9fc',
    marginRight: 8,
    marginBottom: 8,
  },
  filterBtnActive: { backgroundColor: '#1f4f82' },
  filterBtnText: { color: '#27496b', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f4fb',
  },

  fabRow: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'column',
    alignItems: 'center',
  },
  fab: {
    backgroundColor: '#1f4f82',
    width: 58,
    height: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 24, fontWeight: '700' },
});

export default App;