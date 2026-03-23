import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { useProfileStore } from '../../store/profileStore';
import { api } from '../../services/api';

interface MacroTargets {
  tdee: number;
  calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
}

function MacroRow({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}{unit}</Text>
    </View>
  );
}

export default function Step3ConfirmScreen() {
  const params = useLocalSearchParams();
  const { saveProfile } = useProfileStore();
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    setLoading(true);
    try {
      const { data } = await api.profile.calculate({
        gender: params.gender,
        weight_kg: parseFloat(params.weight as string),
        height_cm: parseFloat(params.height as string),
        birth_year: parseInt(params.birthYear as string),
        activity_level: params.activity,
        goal: params.goal,
        weekly_change_kg: 0.5,
      });
      setTargets(data as MacroTargets);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('[step3 loadTargets]', 'status:', err.response?.status, 'data:', JSON.stringify(err.response?.data), 'msg:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!targets) return;
    setSaving(true);
    try {
      await saveProfile({
        gender: params.gender as string,
        birth_year: parseInt(params.birthYear as string),
        height_cm: parseFloat(params.height as string),
        weight_kg: parseFloat(params.weight as string),
        activity_level: params.activity as string,
        goal: params.goal as string,
        weekly_change_kg: 0.5,
        tdee: targets.tdee,
        calorie_target: targets.calorie_target,
        protein_target_g: targets.protein_target_g,
        carbs_target_g: targets.carbs_target_g,
        fat_target_g: targets.fat_target_g,
        onboarding_done: true,
      });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('[step3 handleStart]', 'status:', err.response?.status, 'data:', JSON.stringify(err.response?.data), 'msg:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const goalLabels: Record<string, string> = {
    lose: 'Abnehmen',
    maintain: 'Gewicht halten',
    gain: 'Zunehmen',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <View style={styles.header}>
          <Text style={styles.step}>Schritt 3 von 3</Text>
          <Text style={styles.title}>Dein Ernährungsplan</Text>
          <Text style={styles.subtitle}>
            Ziel: {goalLabels[params.goal as string] ?? params.goal}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
        ) : targets ? (
          <>
            {/* TDEE */}
            <View style={styles.tdeeCard}>
              <Text style={styles.tdeeLabel}>Dein täglicher Kalorienbedarf</Text>
              <Text style={styles.tdeeValue}>{targets.tdee.toLocaleString('de-DE')}</Text>
              <Text style={styles.tdeeUnit}>kcal / Tag</Text>
            </View>

            {/* Target */}
            <View style={styles.targetCard}>
              <Text style={styles.targetLabel}>Dein Kalorienzielen</Text>
              <Text style={styles.targetValue}>{targets.calorie_target.toLocaleString('de-DE')} kcal</Text>
            </View>

            {/* Macros */}
            <View style={styles.macroCard}>
              <Text style={styles.macroTitle}>Makroziele täglich</Text>
              <MacroRow label="Protein" value={targets.protein_target_g} unit="g" color={Colors.protein} />
              <MacroRow label="Kohlenhydrate" value={targets.carbs_target_g} unit="g" color={Colors.carbs} />
              <MacroRow label="Fett" value={targets.fat_target_g} unit="g" color={Colors.fat} />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Diese Werte werden täglich mit deinen Mahlzeiten verglichen. Du kannst sie jederzeit in den Einstellungen anpassen.
              </Text>
            </View>

            <Button
              title="Los geht's! 🚀"
              onPress={handleStart}
              loading={saving}
              size="lg"
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: 24, gap: 20 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotDone: { backgroundColor: Colors.primaryDark },
  dotActive: { backgroundColor: Colors.primary },
  header: { gap: 8 },
  step: { color: Colors.primary, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  title: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 15 },
  loader: { marginTop: 64 },
  tdeeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  tdeeLabel: { color: Colors.textSecondary, fontSize: 14 },
  tdeeValue: { color: Colors.text, fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  tdeeUnit: { color: Colors.textMuted, fontSize: 14 },
  targetCard: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  targetLabel: { color: Colors.textSecondary, fontSize: 14 },
  targetValue: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  macroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  macroTitle: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  macroValue: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  infoBox: {
    backgroundColor: Colors.accent + '15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  infoText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
