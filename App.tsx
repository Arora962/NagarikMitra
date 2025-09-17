/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type Report = {
  id: string;
  photoUri: string;
  location: { latitude: number; longitude: number } | null;
  description: string;
  createdAt: string;
};

const REPORTS_KEY = 'CIVIC_REPORTS';

const App = () => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await AsyncStorage.getItem(REPORTS_KEY);
      if (data) setReports(JSON.parse(data));
    } catch (e) {
      // ignore
    }
  };

  const saveReports = async (newReports: Report[]) => {
    setReports(newReports);
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(newReports));
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
        Alert.alert('Location Error', err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  };

  const handleSubmit = async () => {
    if (!photoUri || !location || !description.trim()) {
      Alert.alert('Please fill all fields and add a photo.');
      return;
    }
    const newReport: Report = {
      id: Date.now().toString(),
      photoUri,
      location,
      description,
      createdAt: new Date().toISOString(),
    };
    const newReports = [newReport, ...reports];
    await saveReports(newReports);
    setPhotoUri(null);
    setLocation(null);
    setDescription('');
    Alert.alert('Report submitted!', 'Thank you for helping your city.');
  };

  const renderReport = ({ item }: { item: Report }) => (
    <View style={styles.reportItem}>
      <Image source={{ uri: item.photoUri }} style={styles.reportImage} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.reportDesc}>{item.description}</Text>
        <Text style={styles.reportMeta}>
          Lat: {item.location?.latitude.toFixed(4)}, Lng: {item.location?.longitude.toFixed(4)}
        </Text>
        <Text style={styles.reportMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Civic Issue Reporting</Text>
        <View style={styles.form}>
          <View style={styles.photoRow}>
            <Button title="Take Photo" onPress={handleTakePhoto} />
            <View style={{ width: 8 }} />
            <Button title="Pick from Gallery" onPress={handlePickImage} />
          </View>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          )}
          <Button title={location ? `Location: (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})` : loading ? 'Getting Location...' : 'Get Current Location'} onPress={handleGetLocation} disabled={loading} />
          <TextInput
            style={styles.input}
            placeholder="Describe the issue..."
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Button title="Submit Report" onPress={handleSubmit} />
        </View>
        <Text style={styles.subtitle}>Submitted Reports</Text>
        {reports.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888' }}>No reports yet.</Text>
        ) : (
          <FlatList
            data={reports}
            renderItem={renderReport}
            keyExtractor={(item) => item.id}
            style={{ marginTop: 8 }}
          />
        )}
      </ScrollView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2a4d69',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  photoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'center',
  },
  previewImage: {
    width: 180,
    height: 120,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
    minHeight: 48,
    backgroundColor: '#fafafa',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2a4d69',
  },
  reportItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  reportImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  reportDesc: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  reportMeta: {
    fontSize: 12,
    color: '#666',
  },
});

export default App;
