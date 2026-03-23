import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { showAlert } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { api, ParsedMealItem } from '../../services/api';

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Frühstück' },
  { value: 'lunch', label: '☀️ Mittagessen' },
  { value: 'dinner', label: '🌙 Abendessen' },
  { value: 'snack', label: '🍎 Snack' },
];

function getMealTypeFromHour(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 19) return 'dinner';
  return 'snack';
}

const INPUT_MODES = ['KI Text', 'Suche', 'Barcode'] as const;
type InputMode = (typeof INPUT_MODES)[number];

export default function LogScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('KI Text');
  const [mealType, setMealType] = useState(getMealTypeFromHour());
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleAIParse = async () => {
    if (inputText.trim().length < 2) {
      showAlert('Hinweis', 'Bitte beschreibe deine Mahlzeit.');
      return;
    }
    setParsing(true);
    try {
      const { data } = await api.ai.parseMeal(inputText);
      router.push({
        pathname: '/modals/meal-detail',
        params: {
          items: JSON.stringify(data.items),
          mealType,
          rawInput: inputText,
        },
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showAlert('Fehler', error.response?.data?.error ?? 'KI-Analyse fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setParsing(false);
    }
  };

  const EXAMPLE_INPUTS = [
    '2 Eier, Toast und Avocado',
    '150g Hähnchenbrust mit Reis und Brokkoli',
    'Haferflocken mit Banane und Milch',
    'Cappuccino und ein Croissant',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Meal Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mahlzeit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {MEAL_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeBtn, mealType === t.value && styles.typeBtnActive]}
                onPress={() => setMealType(t.value)}
              >
                <Text style={[styles.typeBtnText, mealType === t.value && styles.typeBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mode Switcher */}
        <View style={styles.modeSwitcher}>
          {INPUT_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KI Text Mode */}
        {mode === 'KI Text' && (
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>✨ KI-Analyse</Text>
              <Text style={styles.aiSubtitle}>Beschreibe deine Mahlzeit — Zikki erkennt alles automatisch</Text>
            </View>

            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="z.B. 2 Eier, Toast mit Butter und einen Cappuccino..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Button
              title={parsing ? 'Analysiere...' : '✨ Analysieren'}
              onPress={handleAIParse}
              loading={parsing}
              size="lg"
            />

            {/* Examples */}
            <View style={styles.examplesSection}>
              <Text style={styles.examplesLabel}>Beispiele:</Text>
              <View style={styles.examplesList}>
                {EXAMPLE_INPUTS.map((ex) => (
                  <TouchableOpacity
                    key={ex}
                    style={styles.exampleChip}
                    onPress={() => setInputText(ex)}
                  >
                    <Text style={styles.exampleText}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Search Mode */}
        {mode === 'Suche' && (
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.push({ pathname: '/modals/food-search', params: { mealType } })}
          >
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <Text style={styles.searchBtnText}>Lebensmittel suchen...</Text>
          </TouchableOpacity>
        )}

        {/* Barcode Mode */}
        {mode === 'Barcode' && (
          <View style={styles.barcodeSection}>
            <View style={styles.barcodeIcon}>
              <Ionicons name="barcode-outline" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.barcodeTitle}>Barcode scannen</Text>
            <Text style={styles.barcodeText}>
              Scanne den Barcode auf der Verpackung. Wir suchen automatisch in unserer Datenbank und bei OpenFoodFacts.
            </Text>
            <Button
              title="Kamera öffnen"
              onPress={() => router.push({ pathname: '/modals/barcode-scanner', params: { mealType } })}
              size="lg"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeRow: { gap: 8 },
  typeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  typeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  typeBtnTextActive: { color: Colors.primary, fontWeight: '600' },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.surfaceHigh },
  modeBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  modeBtnTextActive: { color: Colors.text, fontWeight: '600' },
  aiSection: { gap: 16 },
  aiHeader: { gap: 4 },
  aiTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  aiSubtitle: { color: Colors.textSecondary, fontSize: 14 },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 24,
  },
  examplesSection: { gap: 8 },
  examplesLabel: { color: Colors.textMuted, fontSize: 13 },
  examplesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exampleChip: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exampleText: { color: Colors.textSecondary, fontSize: 12 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
  },
  searchBtnText: { color: Colors.textMuted, fontSize: 16 },
  barcodeSection: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  barcodeIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeTitle: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  barcodeText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
});
