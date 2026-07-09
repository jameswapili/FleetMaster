import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    trucks: 0, drivers: 0, employees: 0, fuelCost: 0, pendingMaintenance: 0,
  });

  const fetchStats = useCallback(async () => {
    setError('');
    const [trucks, drivers, employees, fuel, maint] = await Promise.all([
      supabase.from('trucks').select('*', { count: 'exact', head: true }),
      supabase.from('drivers').select('*', { count: 'exact', head: true }),
      supabase.from('employees').select('*', { count: 'exact', head: true }),
      supabase.from('fuel_logs').select('cost'),
      supabase.from('maintenance_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    const anyError = trucks.error || drivers.error || employees.error || fuel.error || maint.error;
    if (anyError) {
      setError(anyError.message);
    } else {
      const fuelCost = (fuel.data || []).reduce((sum, f: any) => sum + Number(f.cost), 0);
      setStats({
        trucks: trucks.count || 0,
        drivers: drivers.count || 0,
        employees: employees.count || 0,
        fuelCost,
        pendingMaintenance: maint.count || 0,
      });
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  const cards = [
    { label: 'TOTAL TRUCKS', value: stats.trucks },
    { label: 'TOTAL DRIVERS', value: stats.drivers },
    { label: 'TOTAL EMPLOYEES', value: stats.employees },
    { label: 'FUEL COST (ALL TIME)', value: `TZS ${stats.fuelCost.toLocaleString()}` },
    { label: 'PENDING MAINTENANCE', value: stats.pendingMaintenance },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Text style={styles.hint}>Live counts pulled directly from your Supabase tables.</Text>
      {cards.map((c, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.label}>{c.label}</Text>
          <Text style={styles.value}>{c.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, marginBottom: 12, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.mutedForeground, marginBottom: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, marginBottom: 10 },
  label: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.5 },
  value: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginTop: 6 },
});