import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';

const RING_SIZE = 48;
const STROKE = 5;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function MacroPill({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const offset = CIRC * (1 - pct);
  const over = goal > 0 && value > goal;

  return (
    <View style={styles.pill}>
      {/* Mini ring */}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
            stroke={Colors.surfaceHigh} strokeWidth={STROKE} fill="none"
          />
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
            stroke={over ? Colors.danger : color}
            strokeWidth={STROKE} fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
          />
        </Svg>
        <Text style={[styles.ringPct, { color: over ? Colors.danger : color }]}>
          {Math.round(pct * 100)}
        </Text>
      </View>
      <Text style={[styles.macroVal, over && { color: Colors.danger }]}>
        {Math.round(value)}<Text style={styles.macroUnit}>g</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroGoal}>/ {Math.round(goal)}g</Text>
    </View>
  );
}

interface MacroBarsProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}

export function MacroBars({ protein, carbs, fat, proteinGoal, carbsGoal, fatGoal }: MacroBarsProps) {
  return (
    <View style={styles.row}>
      <MacroPill label="Protein" value={protein} goal={proteinGoal} color={Colors.protein} />
      <View style={styles.divider} />
      <MacroPill label="Carbs" value={carbs} goal={carbsGoal} color={Colors.carbs} />
      <View style={styles.divider} />
      <MacroPill label="Fett" value={fat} goal={fatGoal} color={Colors.fat} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    height: 56,
    backgroundColor: Colors.border,
  },
  pill: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ringPct: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
  },
  macroVal: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  macroUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  macroLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  macroGoal: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});
