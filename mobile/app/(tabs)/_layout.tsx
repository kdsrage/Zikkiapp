import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 65,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerTitle: '🥗 Zikki',
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Hinzufügen',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 4} color={color} />,
          headerTitle: 'Mahlzeit hinzufügen',
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: 'Gewicht',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-down" size={size} color={color} />,
          headerTitle: 'Gewichtsprotokoll',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          headerTitle: 'Mein Profil',
        }}
      />
    </Tabs>
  );
}
