import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  suffix?: string;
}

export function Input({ label, error, suffix, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error && styles.inputError, suffix && styles.inputWithSuffix, style]}
          placeholderTextColor={Colors.textMuted}
          {...props}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: Colors.danger },
  inputWithSuffix: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  suffix: {
    backgroundColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: Colors.textSecondary,
    fontSize: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: Colors.border,
  },
  error: { color: Colors.danger, fontSize: 12 },
});
