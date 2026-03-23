import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LogEntry } from '../../services/api';
import { Colors } from '../../constants/colors';
import { useLogStore } from '../../store/logStore';

interface MealEntryProps {
  entry: LogEntry;
}

export function MealEntry({ entry }: MealEntryProps) {
  const deleteEntry = useLogStore((s) => s.deleteEntry);

  const handleDelete = () => {
    Alert.alert('Löschen?', `"${entry.food_name}" aus dem Tagebuch entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteEntry(entry.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.food_name}
        </Text>
        <Text style={styles.detail}>
          {Math.round(entry.amount_g)}g · P {Math.round(entry.protein_g)}g · K {Math.round(entry.carbs_g)}g · F {Math.round(entry.fat_g)}g
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.calories}>{Math.round(entry.calories)}</Text>
        <Text style={styles.kcal}>kcal</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
        <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: 15, fontWeight: '500', marginBottom: 2 },
  detail: { color: Colors.textMuted, fontSize: 12 },
  right: { alignItems: 'flex-end' },
  calories: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  kcal: { color: Colors.textMuted, fontSize: 11 },
  deleteBtn: { padding: 4 },
});
