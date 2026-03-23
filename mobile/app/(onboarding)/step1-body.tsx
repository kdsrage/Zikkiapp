import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const GENDERS = [
  { value: 'male', label: '♂ Männlich' },
  { value: 'female', label: '♀ Weiblich' },
  { value: 'other', label: '◎ Divers' },
];

export default function Step1BodyScreen() {
  const router = useRouter();
  const [gender, setGender] = useState<string>('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!gender || !birthYear || !height || !weight) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }
    const year = parseInt(birthYear);
    const age = new Date().getFullYear() - year;
    if (age < 10 || age > 120) {
      setError('Ungültiges Geburtsjahr.');
      return;
    }
    setError('');
    router.push({
      pathname: '/(onboarding)/step2-goals',
      params: { gender, birthYear, height, weight },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progress}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <View style={styles.header}>
            <Text style={styles.step}>Schritt 1 von 3</Text>
            <Text style={styles.title}>Deine Körperdaten</Text>
            <Text style={styles.subtitle}>Damit wir deinen Kalorienbedarf berechnen können</Text>
          </View>

          <View style={styles.form}>
            {/* Gender */}
            <View style={styles.group}>
              <Text style={styles.label}>Geschlecht</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.genderBtn, gender === g.value && styles.genderBtnActive]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text style={[styles.genderText, gender === g.value && styles.genderTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="Geburtsjahr"
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="number-pad"
              placeholder="z.B. 1990"
              maxLength={4}
            />
            <Input
              label="Größe"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="z.B. 175"
              suffix="cm"
            />
            <Input
              label="Aktuelles Gewicht"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="z.B. 75"
              suffix="kg"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title="Weiter →" onPress={handleNext} size="lg" style={styles.btn} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, gap: 28 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary },
  header: { gap: 8 },
  step: { color: Colors.primary, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  title: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 15 },
  form: { gap: 18 },
  group: { gap: 8 },
  label: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  genderText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  genderTextActive: { color: Colors.primary, fontWeight: '600' },
  error: { color: Colors.danger, fontSize: 13 },
  btn: { marginTop: 8 },
});
