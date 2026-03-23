import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/colors';

const W = 220;
const H = 130;
const CX = W / 2;
const CY = H - 10;
const R = 96;
const STROKE = 14;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

function describeArc(startDeg: number, endDeg: number, r: number) {
  const s = polarToXY(startDeg, r);
  const e = polarToXY(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export function CalorieRing({ consumed, goal }: CalorieRingProps) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = consumed > goal;
  const ringColor = over ? Colors.danger : Colors.primary;

  // Arc from 180° (left) to 0° (right) — bottom half of circle
  const START = 180;
  const END = 0;
  const arcSpan = 180;
  const fillEnd = START + arcSpan * pct; // goes from 180 → 360 (=0)
  const actualEnd = START + arcSpan * Math.min(pct, 1);

  const bgPath = describeArc(180, 360, R);
  const fgPath = pct > 0 ? describeArc(180, actualEnd, R) : null;

  const remaining = Math.max(goal - Math.round(consumed), 0);
  const overAmount = Math.round(consumed - goal);

  return (
    <View style={styles.wrapper}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={Colors.primaryLight} stopOpacity="1" />
            <Stop offset="1" stopColor={over ? Colors.danger : Colors.accent} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Background arc */}
        <Path
          d={bgPath}
          stroke={Colors.surfaceHigh}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        {fgPath && (
          <Path
            d={fgPath}
            stroke="url(#gaugeGrad)"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Needle dot */}
        {pct > 0 && (() => {
          const dot = polarToXY(Math.min(180 + arcSpan * pct, 360), R);
          return (
            <Circle
              cx={dot.x}
              cy={dot.y}
              r={6}
              fill={ringColor}
              stroke={Colors.background}
              strokeWidth={2}
            />
          );
        })()}
      </Svg>

      {/* Center labels */}
      <View style={styles.center}>
        <Text style={styles.consumed}>{Math.round(consumed)}</Text>
        <Text style={styles.unit}>kcal</Text>
        <Text style={[styles.remaining, over && { color: Colors.danger }]}>
          {over ? `+${overAmount} über Ziel` : `${remaining} verbleibend`}
        </Text>
      </View>

      {/* Goal label */}
      <Text style={styles.goalLabel}>Ziel: {Math.round(goal)} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: W,
  },
  center: {
    position: 'absolute',
    bottom: 22,
    alignItems: 'center',
  },
  consumed: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  unit: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  remaining: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 3,
  },
  goalLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
