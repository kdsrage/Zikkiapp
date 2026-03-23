import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CalorieRing } from '../../components/nutrition/CalorieRing';
import { MacroBars } from '../../components/nutrition/MacroBars';
import { MealEntry } from '../../components/nutrition/MealEntry';
import { Card } from '../../components/ui/Card';
import { useLogStore } from '../../store/logStore';
import { useProfileStore } from '../../store/profileStore';
import { api, DailyInsight, LogEntry } from '../../services/api';

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Frühstück',
  lunch: '☀️ Mittagessen',
  dinner: '🌙 Abendessen',
  snack: '🍎 Snack',
};
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

const getToday = () => new Date().toISOString().split('T')[0];

function formatDate(dateStr: string): string {
  const today = getToday();
  const d = new Date(today + 'T00:00:00');
  const yesterday = new Date(d);
  yesterday.setDate(d.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  if (dateStr === today) return 'Heute';
  if (dateStr === yStr) return 'Gestern';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function DashboardScreen() {
  const router = useRouter();
  const { summary, selectedDate, fetchSummary, isLoading, setDate } = useLogStore();
  const { profile } = useProfileStore();
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = getToday();
  const isToday = selectedDate === today;

  useEffect(() => {
    fetchSummary();
    loadInsight();
  }, []);

  const loadInsight = async () => {
    setInsightLoading(true);
    try {
      const { data } = await api.ai.getDailyInsight();
      setInsight(data);
    } catch {
      // Silently fail — insight is optional
    } finally {
      setInsightLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSummary(selectedDate), loadInsight()]);
    setRefreshing(false);
  }, [selectedDate]);

  // FIX 1: Correct date navigation
  const goBack = () => {
    const current = useLogStore.getState().selectedDate;
    setDate(addDays(current, -1));
  };
  const goForward = () => {
    const current = useLogStore.getState().selectedDate;
    const todayStr = getToday();
    if (current < todayStr) setDate(addDays(current, 1));
  };
  const goToday = () => {
    const current = useLogStore.getState().selectedDate;
    if (current !== getToday()) setDate(getToday());
  };

  const goals = summary?.goals ?? {
    calorie_target: profile?.calorie_target ?? 2000,
    protein_target_g: profile?.protein_target_g ?? 150,
    carbs_target_g: profile?.carbs_target_g ?? 200,
    fat_target_g: profile?.fat_target_g ?? 65,
  };

  const grouped: Record<string, LogEntry[]> = {};
  (summary?.entries ?? []).forEach((e) => {
    if (!grouped[e.meal_type]) grouped[e.meal_type] = [];
    grouped[e.meal_type].push(e);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* FIX 1: Date Navigation with "Heute" button */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goBack} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToday} style={styles.dateLabelArea}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            {!isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>→ Heute</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goForward}
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isToday ? Colors.border : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Calorie Gauge + Macros */}
        <Card style={styles.statsCard} glow>
          <View style={styles.gaugeRow}>
            <CalorieRing consumed={summary?.total_calories ?? 0} goal={goals.calorie_target} />
          </View>
          <View style={styles.macroDivider} />
          <MacroBars
            protein={summary?.total_protein_g ?? 0}
            carbs={summary?.total_carbs_g ?? 0}
            fat={summary?.total_fat_g ?? 0}
            proteinGoal={goals.protein_target_g}
            carbsGoal={goals.carbs_target_g}
            fatGoal={goals.fat_target_g}
          />
        </Card>

        {/* AI Coach */}
        <Card style={styles.insightCard} padding={0}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightTitle}>💡 Zikki Coach</Text>
            <TouchableOpacity onPress={loadInsight} disabled={insightLoading} hitSlop={8}>
              {insightLoading
                ? <ActivityIndicator size="small" color={Colors.textMuted} />
                : <Ionicons name="refresh" size={16} color={Colors.textMuted} />
              }
            </TouchableOpacity>
          </View>
          {insightLoading && !insight ? (
            <View style={styles.insightLoading}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.insightLoadingText}>Zikki analysiert deinen Tag...</Text>
            </View>
          ) : insight && insight.insights.length > 0 ? (
            insight.insights.slice(0, 2).map((ins, i) => (
              <View key={i} style={[styles.insightItem, i < 1 && styles.insightDivider]}>
                <Text style={styles.insightEmoji}>{ins.emoji}</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightItemTitle}>{ins.title}</Text>
                  <Text style={styles.insightMessage}>{ins.message}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.insightLoading}>
              <Text style={styles.insightLoadingText}>
                Starte das Backend und trage Mahlzeiten ein, um Coaching zu erhalten.
              </Text>
            </View>
          )}
        </Card>

        {/* Meal sections */}
        {isLoading && !refreshing ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <>
            {MEAL_ORDER.map((mealType) => {
              const entries = grouped[mealType];
              if (!entries || entries.length === 0) return null;
              const mealCals = entries.reduce((s, e) => s + Number(e.calories), 0);
              const accentColors: Record<string, string> = {
                breakfast: Colors.warning,
                lunch: Colors.accent,
                dinner: Colors.primary,
                snack: Colors.success,
              };
              return (
                <Card key={mealType} style={styles.mealCard}>
                  <View style={[styles.mealAccent, { backgroundColor: accentColors[mealType] ?? Colors.primary }]} />
                  <View style={styles.mealInner}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealTitle}>{MEAL_LABELS[mealType]}</Text>
                      <Text style={styles.mealCalories}>{Math.round(mealCals)} kcal</Text>
                    </View>
                    <View style={styles.divider} />
                    {entries.map((entry, idx) => (
                      <View key={entry.id}>
                        <MealEntry entry={entry} />
                        {idx < entries.length - 1 && <View style={styles.entryDivider} />}
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}

            {(!summary?.entries?.length) && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🍽️</Text>
                <Text style={styles.emptyTitle}>
                  {isToday ? 'Noch keine Mahlzeiten heute' : `Keine Einträge für ${formatDate(selectedDate)}`}
                </Text>
                {isToday && (
                  <TouchableOpacity style={styles.addFirstBtn} onPress={() => router.push('/(tabs)/log')}>
                    <Text style={styles.addFirstBtnText}>+ Erste Mahlzeit hinzufügen</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* FAB — nur für heute sichtbar */}
      {isToday && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/log')}>
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 12 },

  // Date navigation
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  dateArrow: { padding: 8 },
  dateArrowDisabled: { opacity: 0.3 },
  dateLabelArea: { flex: 1, alignItems: 'center', gap: 4 },
  dateText: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  todayBadge: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '60',
  },
  todayBadgeText: { color: Colors.primaryLight, fontSize: 11, fontWeight: '600' },

  statsCard: { padding: 20, gap: 0 },
  gaugeRow: { alignItems: 'center' },
  macroDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },

  insightCard: { overflow: 'hidden' },
  insightHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  insightTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  insightLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  insightLoadingText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  insightItem: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  insightDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  insightEmoji: { fontSize: 22, marginTop: 2 },
  insightContent: { flex: 1, gap: 2 },
  insightItemTitle: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  insightMessage: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },

  mealCard: { padding: 0, overflow: 'hidden', flexDirection: 'row' },
  mealAccent: { width: 4, borderRadius: 0, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  mealInner: { flex: 1, padding: 16 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  mealCalories: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 4 },
  entryDivider: { height: 1, backgroundColor: Colors.surfaceHigh },

  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  addFirstBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24, marginTop: 4,
  },
  addFirstBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  bottomSpace: { height: 80 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
