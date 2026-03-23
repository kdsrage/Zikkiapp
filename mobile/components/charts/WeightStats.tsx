import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { WeightLog } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_AREA_W = SCREEN_WIDTH - 96;
const BAR_H = 56;

interface WeightStatsProps {
  history: WeightLog[];
  targetWeight?: number;
  trendSlope?: number; // kg/week
}

function StatBadge({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <View style={styles.badge}>
      <Text style={[styles.badgeValue, color ? { color } : {}]}>
        {value}
        {unit && <Text style={styles.badgeUnit}> {unit}</Text>}
      </Text>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

function SparkBars({ history }: { history: WeightLog[] }) {
  // Show last 30 entries as mini bar chart
  const recent = history.slice(-30);
  if (recent.length < 2) return null;

  const weights = recent.map(w => Number(w.weight_kg));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 0.5;

  const barW = Math.max(4, Math.floor((BAR_AREA_W - recent.length * 2) / recent.length));
  const gap = 2;
  const totalW = recent.length * (barW + gap);

  return (
    <View style={styles.sparkWrap}>
      <Text style={styles.sparkLabel}>30-Tage-Verlauf</Text>
      <Svg width={totalW} height={BAR_H + 12}>
        {recent.map((w, i) => {
          const weight = Number(w.weight_kg);
          const normH = ((weight - minW) / range) * (BAR_H - 8) + 4;
          const x = i * (barW + gap);
          const isLatest = i === recent.length - 1;
          return (
            <Rect
              key={w.id}
              x={x}
              y={BAR_H - normH}
              width={barW}
              height={normH}
              rx={barW / 2}
              fill={isLatest ? Colors.primary : Colors.surfaceMid}
            />
          );
        })}
        {/* Min/Max labels */}
        <SvgText x={0} y={BAR_H + 10} fill={Colors.textMuted} fontSize="9">
          {minW.toFixed(1)}
        </SvgText>
        <SvgText x={totalW - 28} y={BAR_H + 10} fill={Colors.textMuted} fontSize="9" textAnchor="end">
          {maxW.toFixed(1)} kg
        </SvgText>
      </Svg>
    </View>
  );
}

function ConsistencyDots({ history }: { history: WeightLog[] }) {
  // Show last 28 days as dot grid (4 rows × 7 cols)
  const days: { date: string; logged: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, logged: history.some(w => w.log_date === dateStr) });
  }

  const loggedCount = days.filter(d => d.logged).length;

  return (
    <View style={styles.consistencyWrap}>
      <View style={styles.consistencyHeader}>
        <Text style={styles.sparkLabel}>Konsistenz (28 Tage)</Text>
        <Text style={[styles.consistencyPct, { color: loggedCount >= 20 ? Colors.success : loggedCount >= 12 ? Colors.warning : Colors.textMuted }]}>
          {loggedCount}/28
        </Text>
      </View>
      <View style={styles.dotGrid}>
        {days.map((day, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: day.logged ? Colors.primary : Colors.surfaceHigh }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function WeightStats({ history, targetWeight, trendSlope }: WeightStatsProps) {
  if (history.length === 0) return null;

  const weights = history.map(w => Number(w.weight_kg));
  const latest = weights[weights.length - 1];
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);

  // 7-day average
  const last7 = weights.slice(-7);
  const avg7 = last7.reduce((a, b) => a + b, 0) / last7.length;

  // BMI if we can estimate (height not tracked here, skip or show placeholder)
  const totalDelta = latest - weights[0];

  // Velocity badge
  let velocityLabel = '—';
  let velocityColor: string = Colors.textMuted;
  if (trendSlope !== undefined) {
    if (Math.abs(trendSlope) < 0.05) {
      velocityLabel = '⚖ Stabil';
      velocityColor = Colors.textSecondary;
    } else if (trendSlope < 0) {
      velocityLabel = `↓ ${Math.abs(trendSlope).toFixed(2)} kg/W`;
      velocityColor = Colors.success;
    } else {
      velocityLabel = `↑ ${trendSlope.toFixed(2)} kg/W`;
      velocityColor = Colors.danger;
    }
  }

  return (
    <View style={styles.container}>
      {/* Top stats row */}
      <View style={styles.statsRow}>
        <StatBadge label="Aktuell" value={latest.toFixed(1)} unit="kg" color={Colors.primary} />
        <View style={styles.vDivider} />
        <StatBadge label="Min" value={minW.toFixed(1)} unit="kg" color={Colors.success} />
        <View style={styles.vDivider} />
        <StatBadge label="Max" value={maxW.toFixed(1)} unit="kg" color={Colors.danger} />
        <View style={styles.vDivider} />
        <StatBadge label="Ø 7 Tage" value={avg7.toFixed(1)} unit="kg" />
      </View>

      {/* Delta + velocity row */}
      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipLabel}>Gesamt</Text>
          <Text style={[styles.infoChipVal, { color: totalDelta <= 0 ? Colors.success : Colors.danger }]}>
            {totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.infoChip}>
          <Text style={styles.infoChipLabel}>Trend</Text>
          <Text style={[styles.infoChipVal, { color: velocityColor }]}>{velocityLabel}</Text>
        </View>

        {targetWeight && (
          <View style={styles.infoChip}>
            <Text style={styles.infoChipLabel}>Zum Ziel</Text>
            <Text style={[styles.infoChipVal, {
              color: Math.abs(latest - targetWeight) < 0.5 ? Colors.success : Colors.textSecondary
            }]}>
              {(latest - targetWeight) > 0 ? '+' : ''}{(latest - targetWeight).toFixed(1)} kg
            </Text>
          </View>
        )}
      </View>

      {/* Spark bars */}
      <SparkBars history={history} />

      {/* Consistency */}
      <ConsistencyDots history={history} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  badgeValue: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  badgeUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  badgeLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  vDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoChip: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  infoChipLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoChipVal: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  sparkWrap: {
    gap: 8,
  },
  sparkLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  consistencyWrap: {
    gap: 10,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consistencyPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  dotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
