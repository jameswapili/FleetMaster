import { Fuel as FuelIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type FuelLog = {
  id: string;
  truck_code: string;
  liters: number;
  cost: number;
  station: string | null;
  logged_date: string;
};

const PAGE_SIZE = 25;

export default function FuelScreen() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totals, setTotals] = useState({ liters: 0, cost: 0 });

  const fetchLogs = useCallback(async (pageNum: number, append: boolean) => {
    setError('');
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('logged_date', { ascending: false })
      .range(from, to);
    if (error) {
      setError(error.message);
    } else {
      const rows = data as FuelLog[];
      setLogs(prev => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  // Lightweight aggregate query — sums entire table server-side instead of
  // pulling every row down just to add them up on the phone.
  const fetchTotals = useCallback(async () => {
    const { data, error } = await supabase.rpc('fuel_totals');
    if (!error && data && data.length > 0) {
      setTotals({ liters: Number(data[0].total_liters), cost: Number(data[0].total_cost) });
    }
  }, []);

  useEffect(() => {
    fetchLogs(0, false);
    fetchTotals();
  }, [fetchLogs, fetchTotals]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchLogs(0, false);
    fetchTotals();
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchLogs(nextPage, true);
  };

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

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL LITERS</Text>
          <Text style={styles.statValue}>{totals.liters.toLocaleString()} L</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL COST</Text>
          <Text style={styles.statValue}>TZS {totals.cost.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Fuel Logs</Text>

      {logs.length === 0 ? (
        <Text style={styles.emptyText}>No fuel logs yet.</Text>
      ) : (
        logs.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}><FuelIcon size={16} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.truck_code}</Text>
                <Text style={styles.code}>{l.station || 'Unknown station'} · {l.logged_date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.liters}>{l.liters} L</Text>
                <Text style={styles.cost}>TZS {Number(l.cost).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ))
      )}

      {hasMore && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>Load More</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, marginBottom: 12, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 14 },
  statLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  liters: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  cost: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  loadMoreBtn: { backgroundColor: colors.card, borderRadius: radius, padding: 14, alignItems: 'center', marginTop: 4 },
  loadMoreText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});