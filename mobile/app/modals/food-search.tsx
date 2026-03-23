import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { api, Food } from '../../services/api';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealType = params.mealType as string ?? 'snack';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    searchFoods(debouncedQuery);
  }, [debouncedQuery]);

  const searchFoods = async (q: string) => {
    setLoading(true);
    try {
      const { data } = await api.foods.search(q);
      setResults(data);
    } catch {}
    setLoading(false);
  };

  const selectFood = (food: Food) => {
    // Navigate to meal-detail with serving size as default amount
    const defaultAmount = food.serving_size_g ?? 100;
    const ratio = defaultAmount / 100;
    const item = {
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      amount_g: defaultAmount,
      unit: food.serving_desc ?? `${defaultAmount}g`,
      calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
      protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
      fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
      food_id: food.id,
    };

    router.push({
      pathname: '/modals/meal-detail',
      params: { items: JSON.stringify([item]), mealType },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Lebensmittel suchen..."
          placeholderTextColor={Colors.textMuted}
          autoFocus
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} style={styles.searchIcon} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 1 && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Kein Ergebnis für "{query}"</Text>
              <Text style={styles.emptyHint}>Tipp: Versuche einen kürzeren Begriff</Text>
            </View>
          ) : query.length < 2 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Mindestens 2 Zeichen eingeben</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => selectFood(item)}>
            <View style={styles.resultInfo}>
              <View style={styles.resultTop}>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                {item.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
              {item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}
              <Text style={styles.resultMacros}>
                P {item.protein_per_100g}g · K {item.carbs_per_100g}g · F {item.fat_per_100g}g per 100g
              </Text>
            </View>
            <View style={styles.resultCalories}>
              <Text style={styles.caloriesValue}>{Math.round(item.calories_per_100g)}</Text>
              <Text style={styles.caloriesUnit}>kcal/100g</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  resultInfo: { flex: 1 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultName: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '500' },
  verifiedBadge: {
    backgroundColor: Colors.primary + '30',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  verifiedText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  resultBrand: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  resultMacros: { color: Colors.textTertiary, fontSize: 11, marginTop: 3 },
  resultCalories: { alignItems: 'flex-end' },
  caloriesValue: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  caloriesUnit: { color: Colors.textMuted, fontSize: 10 },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '500' },
  emptyHint: { color: Colors.textMuted, fontSize: 13 },
});
