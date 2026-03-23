import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { api, Food } from '../../services/api';

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealType = params.mealType as string ?? 'snack';

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.permissionTitle}>Kamera-Zugriff erforderlich</Text>
        <Text style={styles.permissionText}>
          Zikki benötigt Zugriff auf die Kamera, um Barcodes scannen zu können.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Zugriff erlauben</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data: barcode }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const { data } = await api.foods.getByBarcode(barcode);
      navigateToDetail(data);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        Alert.alert(
          'Produkt nicht gefunden',
          `Barcode: ${barcode}\n\nDieses Produkt ist noch nicht in unserer Datenbank. Möchtest du es manuell hinzufügen?`,
          [
            { text: 'Erneut scannen', onPress: () => setScanned(false) },
            {
              text: 'Manuell suchen',
              onPress: () => router.replace({ pathname: '/modals/food-search', params: { mealType } }),
            },
          ]
        );
      } else {
        Alert.alert('Fehler', 'Produkt konnte nicht geladen werden.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToDetail = (food: Food) => {
    const defaultAmount = food.serving_size_g ?? 100;
    const ratio = defaultAmount / 100;
    const item = {
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      amount_g: defaultAmount,
      unit: food.serving_desc ?? `${defaultAmount}g`,
      calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
      protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
      fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
      food_id: food.id,
    };

    router.replace({
      pathname: '/modals/meal-detail',
      params: { items: JSON.stringify([item]), mealType },
    });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Barcode scannen</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scanning frame */}
        <View style={styles.framingArea}>
          <View style={styles.framingBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            {loading && (
              <ActivityIndicator size="large" color={Colors.primary} style={styles.scanLoader} />
            )}
          </View>
        </View>

        {/* Bottom instructions */}
        <View style={styles.bottomBar}>
          <Text style={styles.instruction}>
            {loading ? 'Produkt wird gesucht...' : 'Halte die Kamera über den Barcode'}
          </Text>
          {scanned && !loading && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
              <Text style={styles.rescanText}>Erneut scannen</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: { color: Colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permissionText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  permissionBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  framingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  framingBox: {
    width: 280,
    height: 180,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.primary,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  scanLoader: { position: 'absolute' },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  instruction: { color: '#fff', fontSize: 15, textAlign: 'center' },
  rescanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  rescanText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
