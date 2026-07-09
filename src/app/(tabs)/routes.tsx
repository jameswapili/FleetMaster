import { ArrowRight, MapPin } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type Route = {
  id: string;
  route_name: string;
  origin: string;
  destination: string;
  distance_km: number | null;
  status: 'planned' | 'active' | 'completed';
  truck_code: string | null;
};

const statusMap = {
  planned: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Planned' },
  active: { bg: '#eff6ff', color: colors.info, label: 'Active' },
  completed: { bg: '#f0fdf4', color: colors.success, label: 'Completed' },
};

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRoutes = useCallback(async () => {
    setError('');
    const { data, error } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRoutes(data as Route[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const onRefresh = () => { setRefreshing(true); fetchRoutes(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {routes.length === 0 ? (
        <Text style={styles.emptyText}>No routes found.</Text>
      ) : (
        routes.map((r) => {
          const s = statusMap[r.status];
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{r.route_name}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <View style={styles.pathRow}>
                <MapPin size={12} color={colors.mutedForeground} />
                <Text style={styles.pathText}>{r.origin}</Text>
                <ArrowRight size={12} color={colors.mutedForeground} />
                <Text style={styles.pathText}>{r.destination}</Text>
              </View>
              <View style={styles.details}>
                {r.distance_km && <Text style={styles.detailText}>{r.distance_km} km</Text>}
                {r.truck_code && <Text style={styles.detailText}>Truck: {r.truck_code}</Text>}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, marginBottom: 12, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  pathText: { fontSize: 12, color: colors.foreground },
  details: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', gap: 16 },
  detailText: { fontSize: 12, color: colors.mutedForeground },
});