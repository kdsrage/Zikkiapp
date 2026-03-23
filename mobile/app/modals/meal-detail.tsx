import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { ParsedMealItem } from '../../services/api';
import { useLogStore } from '../../store/logStore';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
};

function recalculate(item: ParsedMealItem, newAmountG: number): ParsedMealItem {
  if (item.amount_g === 0) return item;
  const ratio = newAmountG / item.amount_g;
  return {
    ...item,
    amount_g: newAmountG,
    calories: Math.round(item.calories * ratio * 10) / 10,
    protein_g: Math.round(item.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(item.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(item.fat_g * ratio * 10) / 10,
  };
}

export default function MealDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addBulkEntries } = useLogStore();

  const rawItems: ParsedMealItem[] = params.items
    ? JSON.parse(params.items as string)
    : params.food
    ? [JSON.parse(params.food as string)]
    : [];

  const mealType = (params.mealType as string) ?? 'snack';
  const rawInput = params.rawInput as string | undefined;

  const [items, setItems] = useState<ParsedMealItem[]>(rawItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const totalCalories = items.reduce((s, i) => s + i.calories, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0);
  const totalFat = items.reduce((s, i) => s + i.fat_g, 0);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditAmount(String(items[index].amount_g));
  };

  const confirmEdit = (index: number) => {
    const g = parseFloat(editAmount);
    if (!isNaN(g) && g > 0) {
      setItems((prev) => prev.map((item, i) => (i === index ? recalculate(item, g) : item)));
    }
    setEditingIndex(null);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      Alert.alert('Keine Einträge', 'Mindestens ein Lebensmittel hinzufügen.');
      return;
    }

    setSaving(true);
    try {
      await addBulkEntries(
        items.map((item) => ({
          food_id: item.food_id,
          food_name: item.name,
          meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          amount_g: item.amount_g,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          raw_input: rawInput,
        }))
      );
      router.back();
      // Navigate to dashboard
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Fehler', 'Konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{MEAL_LABELS[mealType] ?? 'Mahlzeit'}</Text>
        <Text style={styles.subtitle}>{items.length} Lebensmittel · {Math.round(totalCalories)} kcal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => startEdit(index)} style={styles.actionBtn}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>

            {editingIndex === index ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.amountInput}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.gramLabel}>g</Text>
                <TouchableOpacity onPress={() => confirmEdit(index)} style={styles.confirmBtn}>
                  <Text style={styles.confirmBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.amount}>{Math.round(item.amount_g)}g · {item.unit ?? ''}</Text>
            )}

            <View style={styles.macroRow}>
              <View style={styles.macro}>
                <Text style={styles.macroValue}>{Math.round(item.calories)}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macro}>
                <Text style={[styles.macroValue, { color: Colors.protein }]}>{item.protein_g.toFixed(1)}g</Text>
                <Text style={styles.macroLabel}>P</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macro}>
                <Text style={[styles.macroValue, { color: Colors.carbs }]}>{item.carbs_g.toFixed(1)}g</Text>
                <Text style={styles.macroLabel}>K</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macro}>
                <Text style={[styles.macroValue, { color: Colors.fat }]}>{item.fat_g.toFixed(1)}g</Text>
                <Text style={styles.macroLabel}>F</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalTitle}>Gesamt</Text>
          <View style={styles.macroRow}>
            <View style={styles.macro}>
              <Text style={[styles.macroValue, styles.totalValue]}>{Math.round(totalCalories)}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: Colors.protein }]}>{totalProtein.toFixed(1)}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: Colors.carbs }]}>{totalCarbs.toFixed(1)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macro}>
              <Text style={[styles.macroValue, { color: Colors.fat }]}>{totalFat.toFixed(1)}g</Text>
              <Text style={styles.macroLabel}>Fett</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={saving ? 'Wird gespeichert...' : `✓ Zum Tagebuch hinzufügen`}
          onPress={handleSave}
          loading={saving}
          size="lg"
          disabled={items.length === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  scroll: { padding: 16, gap: 10, paddingBottom: 8 },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemName: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    width: 80,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  gramLabel: { color: Colors.textSecondary, fontSize: 14 },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmBtnText: { color: '#000', fontWeight: '700' },
  amount: { color: Colors.textMuted, fontSize: 13 },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  macro: { flex: 1, alignItems: 'center' },
  macroValue: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  macroLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  macroDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  totalCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  totalTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  totalValue: { fontSize: 18, color: Colors.primary },
  footer: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: Colors.border },
});
