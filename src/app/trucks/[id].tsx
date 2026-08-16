import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type TruckStats = {
  truck_id: string;
  truck_code: string;
  model: string;
  total_routes: number;
  total_deliveries: number;
  total_mileage_km: number;
  total_fuel_liters: number;
  avg_km_per_liter: number;
  total_revenue: number;
  total_expenses: number;
  total_profit_loss: number;
  avg_profit_per_route: number;
  total_fuel_cost: number;
  total_road_tolls: number;
  total_other_expenses: number;
};

type RouteRow = {
  id: string;
  client_name: string;
  origin: string;
  destination: string;
  status: string;
  profit_loss: number;
  created_at: string;
};

type FuelLogRow = {
  id: string;
  liters: number;
  cost: number;
  logged_at: string;
  route_id: string | null;
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export default function TruckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [stats, setStats] = useState<TruckStats | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLogRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError('');

    const [statsRes, routesRes, fuelRes] = await Promise.all([
      supabase.from('truck_stats').select('*').eq('truck_id', id).single(),
      supabase
        .from('routes')
        .select('id, client_name, origin, destination, status, profit_loss, created_at')
        .eq('truck_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('fuel_logs')
        .select('id, liters, cost, logged_at, route_id')
        .eq('truck_id', id)
        .order('logged_at', { ascending: false })
        .limit(20),
    ]);

    if (statsRes.error) setError(statsRes.error.message);
    else setStats(statsRes.data as TruckStats);

    if (!routesRes.error) setRoutes(routesRes.data as RouteRow[]);
    if (!fuelRes.error) setFuelLogs(fuelRes.data as FuelLogRow[]);

    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Truck not found.'}</Text>
      </View>
    );
  }

  const isProfit = stats.total_profit_loss >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Back + Header */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <ArrowLeft size={18} color={colors.mutedForeground} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>{stats.model} · {stats.truck_code}</Text>

      {/* Operational Stats */}
      <Text style={styles.sectionTitle}>Operational</Text>
      <View style={styles.operationalCard}>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Total Routes Taken:</Text>
          <Text style={styles.opValue}>{stats.total_routes}</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Successful Deliveries:.</Text>
          <Text style={styles.opValue}>{stats.total_deliveries}</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Total Routes Mileage:</Text>
          <Text style={styles.opValue}>{stats.total_mileage_km.toFixed(0)} Kilometres</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Total Fuel:</Text>
          <Text style={styles.opValue}>{stats.total_fuel_liters.toFixed(0)} Litres</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Average Fuel Consumption:</Text>
          <Text style={styles.opValue}>{stats.avg_km_per_liter?.toFixed(2) ?? '—'} Km/L</Text>
        </View>
      </View>

      {/* Financial Stats */}
      <Text style={styles.sectionTitle}>Financial</Text>
      <View style={styles.card}>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Total Revenue</Text>
          <Text style={styles.finValue}>TZS {formatCurrency(stats.total_revenue)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Fuel Cost</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(stats.total_fuel_cost)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Road Tolls & Permits</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(stats.total_road_tolls)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Other Expenses</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(stats.total_other_expenses)}</Text>
        </View>
        <View style={[styles.finRow, styles.totalRow]}>
          <Text style={[styles.finLabel, styles.totalLabel]}>Total Expenses</Text>
          <Text style={[styles.finValue, styles.expenseValue, styles.totalValue]}>
            TZS {formatCurrency(stats.total_expenses)}
          </Text>
        </View>
        <View style={[styles.finRow, styles.profitRow]}>
          <Text style={[styles.finLabel, styles.totalLabel, isProfit ? styles.profitValue : styles.lossValue]}>
            {isProfit ? 'TOTAL PROFIT' : 'LOSS'}
          </Text>
          <Text style={[styles.finValue, styles.totalValue, isProfit ? styles.profitValue : styles.lossValue]}>
            TZS {formatCurrency(stats.total_profit_loss)}
          </Text>
        </View>
      </View>

      {/* Recent Routes */}
      <Text style={styles.sectionTitle}>Recent Routes</Text>
      {routes.length === 0 ? (
        <Text style={styles.emptyText}>No routes for this truck yet.</Text>
      ) : (
        routes.map((r) => {
          const positive = Number(r.profit_loss) >= 0;
          return (
            <View key={r.id} style={styles.listCard}>
            
              <View style={styles.rowBetween}>
                <Text style={styles.listCardTitle}>{r.client_name}</Text>
                <Text style={[styles.listCardAmount, { color: positive ? colors.success : colors.destructive }]}>
                  TZS {formatCurrency(r.profit_loss)}
                </Text>
              </View>
              <View style={styles.pathRow}>
                <MapPin size={11} color={colors.mutedForeground} />
                <Text style={styles.pathText}>{r.origin}</Text>
                <ArrowRight size={11} color={colors.mutedForeground} />
                <Text style={styles.pathText}>{r.destination}</Text>
              </View>
            </View>
          );
        })
      )}

      {/* Fuel Log History */}
      <Text style={styles.sectionTitle}>Fuel Log History</Text>
      {fuelLogs.length === 0 ? (
        <Text style={styles.emptyText}>No fuel logs for this truck yet.</Text>
      ) : (
        fuelLogs.map((f) => (
          <View key={f.id} style={styles.listCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.listCardTitle}>{f.liters.toFixed(0)} L</Text>
              <Text style={styles.listCardAmount}>TZS {formatCurrency(f.cost)}</Text>
            </View>
            <Text style={styles.pathText}>{new Date(f.logged_at).toLocaleDateString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, textAlign: 'center' },
  emptyText: { color: colors.mutedForeground, marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 13, color: colors.mutedForeground },
  header: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
  operationalCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.card,
    borderRadius: radius,
    paddingVertical: 10,
    paddingHorizontal: 12,
    columnGap: 14,
    rowGap: 8,
    marginBottom: 20,
  },
  operationalItem: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  opLabel: { fontSize: 12, color: colors.mutedForeground },
  opValue: { fontSize: 14, fontWeight: '700', color: colors.success },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 20 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finLabel: { fontSize: 13, color: colors.mutedForeground },
  finValue: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  expenseValue: { color: colors.destructive },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontWeight: '700', color: colors.foreground },
  totalValue: { fontSize: 14, fontWeight: '700' },
  profitRow: { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  profitValue: { color: colors.success },
  lossValue: { color: colors.destructive },
  listCard: { backgroundColor: colors.card, borderRadius: radius, padding: 12, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listCardTitle: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  listCardAmount: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  pathText: { fontSize: 11, color: colors.mutedForeground },
});