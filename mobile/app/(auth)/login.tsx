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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Fehler', 'Bitte Benutzername und Passwort eingeben.');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      Alert.alert('Fehler', error.response?.data?.error ?? 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.appName}>Zikki</Text>
            <Text style={styles.tagline}>Dein KI-Ernährungscoach</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Benutzername"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="benutzername"
            />
            <Input
              label="Passwort"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
            />
            <Button
              title="Einloggen"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
              size="lg"
            />
          </View>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Noch kein Konto?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Jetzt registrieren</Text>
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
  logoContainer: { alignItems: 'center', gap: 10 },
  logoMark: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: Colors.primary + '60',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  logoEmoji: { fontSize: 36 },
  appName: { color: Colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  tagline: { color: Colors.textSecondary, fontSize: 15 },
  form: { gap: 16 },
  loginBtn: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerText: { color: Colors.textSecondary, fontSize: 15 },
  footerLink: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
