import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useLogStore } from '../../store/logStore';
import { useWeightStore } from '../../store/weightStore';

function StatRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}{unit ? ` ${unit}` : ''}</Text>
    </View>
  );
}

const GOAL_LABELS: Record<string, string> = {
  lose: 'Abnehmen',
  maintain: 'Gewicht halten',
  gain: 'Zunehmen',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sitzend',
  light: 'Leicht aktiv',
  moderate: 'Moderat aktiv',
  active: 'Sehr aktiv',
  very_active: 'Extrem aktiv',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, email } = useAuthStore();
  const { profile, reset: resetProfile } = useProfileStore();
  const resetLog = useLogStore((s) => s.reset);
  const { history, reset: resetWeight } = useWeightStore();

  const doLogout = async () => {
    await logout();
    resetLog();
    resetProfile();
    resetWeight();
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Ausloggen?')) doLogout();
      return;
    }
    Alert.alert('Ausloggen?', 'Du wirst ausgeloggt.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Ausloggen', style: 'destructive', onPress: doLogout },
    ]);
  };

  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const startWeight = profile?.weight_kg ?? null;
  const currentWeight = history[history.length - 1]?.weight_kg ?? startWeight;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.name}>{profile?.display_name ?? 'Nutzer'}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Goals */}
        <Card>
          <Text style={styles.cardTitle}>Ziele & Kalorien</Text>
          {profile?.calorie_target && (
            <StatRow label="Kalorienziel" value={profile.calorie_target} unit="kcal" />
          )}
          {profile?.protein_target_g && (
            <StatRow label="Protein" value={profile.protein_target_g} unit="g" />
          )}
          {profile?.carbs_target_g && (
            <StatRow label="Kohlenhydrate" value={profile.carbs_target_g} unit="g" />
          )}
          {profile?.fat_target_g && (
            <StatRow label="Fett" value={profile.fat_target_g} unit="g" />
          )}
          {profile?.tdee && (
            <StatRow label="Grundumsatz (TDEE)" value={profile.tdee} unit="kcal" />
          )}
        </Card>

        {/* Body Data */}
        <Card>
          <Text style={styles.cardTitle}>Körperdaten</Text>
          {age && <StatRow label="Alter" value={age} unit="Jahre" />}
          {profile?.height_cm && <StatRow label="Größe" value={profile.height_cm} unit="cm" />}
          {currentWeight && <StatRow label="Gewicht" value={Number(currentWeight).toFixed(1)} unit="kg" />}
          {profile?.gender && <StatRow label="Geschlecht" value={
            profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers'
          } />}
          {profile?.activity_level && <StatRow label="Aktivitätslevel" value={ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level} />}
          {profile?.goal && <StatRow label="Ziel" value={GOAL_LABELS[profile.goal] ?? profile.goal} />}
        </Card>

        {/* App Info */}
        <Card>
          <Text style={styles.cardTitle}>App</Text>
          <View style={styles.menuRow}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.menuText}>Version 1.0.0</Text>
          </View>
        </Card>

        <Button
          title="Ausloggen"
          onPress={handleLogout}
          variant="danger"
          size="lg"
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 36 },
  name: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  email: { color: Colors.textSecondary, fontSize: 14 },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceHigh },
  statLabel: { color: Colors.textSecondary, fontSize: 14 },
  statValue: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuText: { flex: 1, color: Colors.text, fontSize: 15 },
  divider: { height: 1, backgroundColor: Colors.surfaceHigh },
  logoutBtn: { marginTop: 8, marginBottom: 24 },
});
