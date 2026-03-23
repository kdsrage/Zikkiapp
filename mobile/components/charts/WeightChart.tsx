import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Path, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { WeightLog } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

interface WeightChartProps {
  history: WeightLog[];
  targetWeight?: number;
}

export function WeightChart({ history, targetWeight }: WeightChartProps) {
  if (history.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Mindestens 2 Einträge für den Chart</Text>
      </View>
    );
  }

  const weights = history.map((w) => Number(w.weight_kg));
  const allValues = targetWeight ? [...weights, targetWeight] : weights;
  const minW = Math.min(...allValues) - 1.5;
  const maxW = Math.max(...allValues) + 1.5;
  const range = maxW - minW || 1;

  const plotW = CHART_WIDTH - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  // X positions based on actual dates
  const timestamps = history.map((w) => new Date(w.log_date + 'T00:00:00').getTime());
  const minTs = timestamps[0];
  const maxTs = timestamps[timestamps.length - 1];
  const tsRange = maxTs - minTs || 1;

  const toX = (i: number) => PAD.left + ((timestamps[i] - minTs) / tsRange) * plotW;
  const toY = (w: number) => PAD.top + plotH - ((w - minW) / range) * plotH;

  const points = history.map((w, i) => ({ x: toX(i), y: toY(Number(w.weight_kg)) }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const yTicks = [minW + 0.5, (minW + maxW) / 2, maxW - 0.5];
  const targetY = targetWeight ? toY(targetWeight) : null;

  // X-axis: show label for every point, skip if too close to previous shown label
  const MIN_LABEL_GAP = 36;
  const xLabels: { idx: number; x: number; label: string }[] = [];
  let lastLabelX = -999;
  history.forEach((w, i) => {
    const x = toX(i);
    const date = new Date(w.log_date + 'T00:00:00');
    const label = `${date.getDate()}.${date.getMonth() + 1}`;
    // Always include first and last; skip middle ones that are too close
    const isFirst = i === 0;
    const isLast = i === history.length - 1;
    if (isFirst || isLast || x - lastLabelX >= MIN_LABEL_GAP) {
      xLabels.push({ idx: i, x, label });
      lastLabelX = x;
    }
  });

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      <Defs>
        <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.15" />
          <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {yTicks.map((val, i) => (
        <React.Fragment key={i}>
          <Line
            x1={PAD.left} y1={toY(val)}
            x2={CHART_WIDTH - PAD.right} y2={toY(val)}
            stroke={Colors.border} strokeWidth={1} strokeDasharray="4,4"
          />
          <SvgText
            x={PAD.left - 6} y={toY(val) + 4}
            fill={Colors.textMuted} fontSize="10" textAnchor="end"
          >
            {val.toFixed(1)}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Target weight line */}
      {targetY !== null && (
        <>
          <Line
            x1={PAD.left} y1={targetY}
            x2={CHART_WIDTH - PAD.right} y2={targetY}
            stroke={Colors.warning} strokeWidth={2}
            strokeDasharray="6,4"
          />
          <SvgText
            x={CHART_WIDTH - PAD.right + 4} y={targetY + 4}
            fill={Colors.warning} fontSize="9" textAnchor="start"
          >
            Ziel
          </SvgText>
        </>
      )}

      {/* Weight line */}
      <Path d={pathD} stroke={Colors.primary} strokeWidth={2.5} fill="none"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={Colors.primary} />
      ))}

      {/* X-axis date labels */}
      {xLabels.map(({ idx, x, label }) => (
        <SvgText
          key={idx}
          x={x}
          y={CHART_HEIGHT - 4}
          fill={Colors.textMuted}
          fontSize="10"
          textAnchor={idx === 0 ? 'start' : idx === history.length - 1 ? 'end' : 'middle'}
        >
          {label}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
});
