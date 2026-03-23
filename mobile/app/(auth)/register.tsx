import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Fehler', 'Bitte Benutzername und Passwort eingeben.');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Fehler', 'Benutzername muss mindestens 3 Zeichen haben.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Fehler', 'Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    setLoading(true);
    try {
      await register(username, password);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Fehler', error.response?.data?.error ?? 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Konto erstellen</Text>
            <Text style={styles.subtitle}>Starte deine Ernährungs-Journey</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Benutzername"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="z.B. max_mustermann"
            />
            <Input
              label="Passwort"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mindestens 6 Zeichen"
            />
            <Button
              title="Registrieren & loslegen"
              onPress={handleRegister}
              loading={loading}
              style={styles.btn}
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Bereits ein Konto?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Einloggen</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 32 },
  header: { gap: 8 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 16 },
  form: { gap: 16 },
  btn: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerText: { color: Colors.textSecondary, fontSize: 15 },
  footerLink: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
