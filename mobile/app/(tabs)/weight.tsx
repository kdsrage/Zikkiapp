import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { showAlert, showConfirm } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { WeightChart } from '../../components/charts/WeightChart';
import { WeightStats } from '../../components/charts/WeightStats';
import { useWeightStore } from '../../store/weightStore';
import { useProfileStore } from '../../store/profileStore';

export default function WeightScreen() {
  const { history, trend, fetchHistory, logWeight, deleteLog } = useWeightStore();
  const { profile, saveProfile } = useProfileStore();

  const [weightInput, setWeightInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [editingTarget, setEditingTarget] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Init target input from profile
  useEffect(() => {
    fetchHistory();
    if (profile?.weight_kg) setTargetInput(String(profile.weight_kg));
  }, []);

  const handleLogWeight = async () => {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(w) || w < 20 || w > 500) {
      showAlert('Ungültiger Wert', 'Bitte gib ein gültiges Gewicht ein (20–500 kg).');
      return;
    }
    setSaving(true);
    try {
      await logWeight(w);
      setWeightInput('');
    } catch {
      showAlert('Fehler', 'Gewicht konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTarget = async () => {
    const t = parseFloat(targetInput.replace(',', '.'));
    if (isNaN(t) || t < 20 || t > 500) {
      showAlert('Ungültig', 'Bitte ein gültiges Zielgewicht eingeben.');
      return;
    }
    setSavingTarget(true);
    try {
      await saveProfile({ weight_kg: t });
      setEditingTarget(false);
    } catch {
      showAlert('Fehler', 'Zielgewicht konnte nicht gespeichert werden.');
    } finally {
      setSavingTarget(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // Calculations
  const latest = history.length > 0 ? Number(history[history.length - 1].weight_kg) : null;
  const startWeight = history.length > 0 ? Number(history[0].weight_kg) : null;
  const targetWeight = profile?.weight_kg ? Number(profile.weight_kg) : null;

  // FIX 2: Progress to goal
  const progressToGoal = (() => {
    if (!latest || !targetWeight || !startWeight || startWeight === targetWeight) return null;
    const totalChange = Math.abs(targetWeight - startWeight);
    const achieved = Math.abs(latest - startWeight);
    const pct = Math.min(Math.round((achieved / totalChange) * 100), 100);
    const remaining = Math.abs(targetWeight - latest);
    const direction = targetWeight < startWeight ? 'lose' : 'gain';
    const onTrack = direction === 'lose' ? latest <= startWeight : latest >= startWeight;
    return { pct, remaining, direction, onTrack };
  })();

  const totalChange = latest !== null && startWeight !== null
    ? Number((latest - startWeight).toFixed(1))
    : null;

  const trendColor = () => {
    if (!trend) return Colors.text;
    if (trend.direction === 'losing') return Colors.primary;
    if (trend.direction === 'gaining') return Colors.danger;
    return Colors.text;
  };

  const trendLabel = () => {
    if (!trend) return '—';
    if (trend.direction === 'losing') return `📉 −${Math.abs(trend.slope_per_week).toFixed(2)} kg/Woche`;
    if (trend.direction === 'gaining') return `📈 +${trend.slope_per_week.toFixed(2)} kg/Woche`;
    return '⚖️ Stabil';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Log today's weight */}
        <Card>
          <Text style={styles.sectionTitle}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.weightInput}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder={latest ? `Zuletzt: ${latest.toFixed(1)}` : 'z.B. 75.5'}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.kgLabel}>kg</Text>
            <Button title="Speichern" onPress={handleLogWeight} loading={saving} style={styles.saveBtn} />
          </View>
        </Card>

        {/* FIX 2: Target weight + progress */}
        <Card>
          <View style={styles.targetHeader}>
            <Text style={styles.sectionTitle}>Zielgewicht</Text>
            <TouchableOpacity onPress={() => setEditingTarget(!editingTarget)} hitSlop={8}>
              <Ionicons name={editingTarget ? 'close' : 'pencil-outline'} size={18} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          {editingTarget ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.weightInput}
                value={targetInput}
                onChangeText={setTargetInput}
                keyboardType="decimal-pad"
                placeholder="z.B. 70.0"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <Text style={styles.kgLabel}>kg</Text>
              <Button title="Speichern" onPress={handleSaveTarget} loading={savingTarget} style={styles.saveBtn} />
            </View>
          ) : (
            <View style={styles.targetDisplay}>
              <Text style={styles.targetValue}>
                {targetWeight ? `${targetWeight.toFixed(1)} kg` : '—'}
              </Text>
              {progressToGoal && (
                <>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressToGoal.pct}%` }]} />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressPct}>{progressToGoal.pct}% erreicht</Text>
                    <Text style={styles.progressRemaining}>
                      noch {progressToGoal.remaining.toFixed(1)} kg
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </Card>


        {/* Statistical weight analysis */}
        {history.length >= 2 && (
          <Card glow>
            <Text style={styles.sectionTitle}>Statistik</Text>
            <WeightStats
              history={history}
              targetWeight={targetWeight ?? undefined}
              trendSlope={trend?.slope_per_week}
            />
          </Card>
        )}

        {/* Trend */}
        {history.length >= 3 && (
          <Card>
            <Text style={styles.trendTitle}>Wochentrend</Text>
            <Text style={[styles.trendValue, { color: trendColor() }]}>{trendLabel()}</Text>
            {progressToGoal && trend?.slope_per_week && Math.abs(trend.slope_per_week) > 0.01 && (
              <Text style={styles.etaText}>
                {(() => {
                  const remaining = progressToGoal.remaining;
                  const weeksLeft = remaining / Math.abs(trend.slope_per_week);
                  if (weeksLeft > 100) return null;
                  const eta = new Date();
                  eta.setDate(eta.getDate() + Math.round(weeksLeft * 7));
                  return `📅 Ziel erreichbar ca. ${eta.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                })()}
              </Text>
            )}
          </Card>
        )}

        {/* FIX 2: Chart mit Ziellinie */}
        {history.length >= 2 && (
          <Card>
            <Text style={styles.chartTitle}>Verlauf</Text>
            <WeightChart history={history} targetWeight={targetWeight ?? undefined} />
            {targetWeight && (
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendText}>Gewicht</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.legendText}>Ziel ({targetWeight.toFixed(1)} kg)</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <Text style={styles.historyTitle}>Protokoll</Text>
            {[...history].reverse().slice(0, 15).map((w) => {
              const diff = targetWeight ? Number(w.weight_kg) - targetWeight : null;
              return (
                <View key={w.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {w.log_date
                      ? new Date(String(w.log_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('de-DE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </Text>
                  <Text style={styles.historyWeight}>{Number(w.weight_kg).toFixed(1)} kg</Text>
                  {diff !== null && (
                    <Text style={[styles.historyDiff, { color: diff <= 0 ? Colors.primary : Colors.danger }]}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => showConfirm(`${Number(w.weight_kg).toFixed(1)} kg löschen?`, () => deleteLog(w.id))}
                  >
                    <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>
        )}

        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⚖️</Text>
            <Text style={styles.emptyTitle}>Noch keine Einträge</Text>
            <Text style={styles.emptyText}>Trage dein Gewicht täglich morgens nüchtern ein.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 12 },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightInput: {
    flex: 1, backgroundColor: Colors.surfaceHigh, borderRadius: 12, padding: 14,
    color: Colors.text, fontSize: 20, fontWeight: '600', borderWidth: 1,
    borderColor: Colors.border, textAlign: 'center',
  },
  kgLabel: { color: Colors.textSecondary, fontSize: 18, fontWeight: '600' },
  saveBtn: { minWidth: 100 },

  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  targetDisplay: { gap: 10 },
  targetValue: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  progressTrack: { height: 10, backgroundColor: Colors.surfaceHigh, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5, maxWidth: '100%' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPct: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  progressRemaining: { color: Colors.textMuted, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  statUnit: { color: Colors.textMuted, fontSize: 11 },

  trendTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  trendValue: { fontSize: 18, fontWeight: '700' },
  etaText: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },

  chartTitle: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  chartLegend: { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.textSecondary, fontSize: 12 },

  historyTitle: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceHigh, gap: 8,
  },
  historyDate: { flex: 1, color: Colors.textSecondary, fontSize: 13 },
  historyWeight: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  historyDiff: { fontSize: 12, fontWeight: '600', minWidth: 40, textAlign: 'right' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
});
