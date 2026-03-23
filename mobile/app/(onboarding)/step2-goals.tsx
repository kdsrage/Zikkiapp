import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';

const ACTIVITIES = [
  { value: 'sedentary', label: 'Sitzend', desc: 'Bürojob, kein Sport' },
  { value: 'light', label: 'Leicht aktiv', desc: '1–2x Sport/Woche' },
  { value: 'moderate', label: 'Moderat aktiv', desc: '3–4x Sport/Woche' },
  { value: 'active', label: 'Sehr aktiv', desc: '5–6x Sport/Woche' },
  { value: 'very_active', label: 'Extrem aktiv', desc: 'Tägliches intensives Training' },
];

const GOALS = [
  { value: 'lose', label: '📉 Abnehmen', desc: 'Körperfett reduzieren' },
  { value: 'maintain', label: '⚖️ Halten', desc: 'Gewicht stabil halten' },
  { value: 'gain', label: '📈 Zunehmen', desc: 'Muskeln aufbauen' },
];

export default function Step2GoalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activity, setActivity] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!activity || !goal) {
      setError('Bitte Aktivitätslevel und Ziel auswählen.');
      return;
    }
    setError('');
    router.push({
      pathname: '/(onboarding)/step3-confirm',
      params: { ...params, activity, goal },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <View style={styles.header}>
          <Text style={styles.step}>Schritt 2 von 3</Text>
          <Text style={styles.title}>Dein Ziel</Text>
          <Text style={styles.subtitle}>Damit wir dein Programm personalisieren</Text>
        </View>

        {/* Activity level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aktivitätslevel</Text>
          <View style={styles.optionList}>
            {ACTIVITIES.map((a) => (
              <TouchableOpacity
                key={a.value}
                style={[styles.option, activity === a.value && styles.optionActive]}
                onPress={() => setActivity(a.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, activity === a.value && styles.optionLabelActive]}>
                    {a.label}
                  </Text>
                  <Text style={styles.optionDesc}>{a.desc}</Text>
                </View>
                {activity === a.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mein Ziel</Text>
          <View style={styles.goalRow}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalCard, goal === g.value && styles.goalCardActive]}
                onPress={() => setGoal(g.value)}
              >
                <Text style={styles.goalEmoji}>{g.label.split(' ')[0]}</Text>
                <Text style={[styles.goalLabel, goal === g.value && styles.goalLabelActive]}>
                  {g.label.split(' ').slice(1).join(' ')}
                </Text>
                <Text style={styles.goalDesc}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Weiter →" onPress={handleNext} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: 24, gap: 24 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotDone: { backgroundColor: Colors.primaryDark },
  dotActive: { backgroundColor: Colors.primary },
  header: { gap: 8 },
  step: { color: Colors.primary, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  title: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 15 },
  section: { gap: 12 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  optionList: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  optionContent: { flex: 1 },
  optionLabel: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  optionLabelActive: { color: Colors.primary },
  optionDesc: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  checkmark: { color: Colors.primary, fontSize: 18, fontWeight: '700' },
  goalRow: { flexDirection: 'row', gap: 10 },
  goalCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  goalCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  goalEmoji: { fontSize: 24 },
  goalLabel: { color: Colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  goalLabelActive: { color: Colors.primary },
  goalDesc: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
  error: { color: Colors.danger, fontSize: 13 },
});
