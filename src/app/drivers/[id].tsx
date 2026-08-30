import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, MapPin, Phone, Star, Truck as TruckIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type DriverInfo = {
  id: string;
  driver_code: string;
  full_name: string;
  phone: string | null;
  license_number: string;
  license_expiry: string;
  rating: number;
  status: 'on_duty' | 'off_duty' | 'on_leave';
};

type DriverStats = {
  driver_id: string;
  total_routes: number;
  total_deliveries: number;
  total_mileage_km: number;
  total_fuel_liters: number;
  avg_km_per_liter: number;
  total_revenue: number;
  total_fuel_cost: number;
  total_road_tolls: number;
  total_other_expenses: number;
  total_expenses: number;
  total_profit_loss: number;
  avg_profit_per_route: number;
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

const statusMap = {
  on_duty: { bg: '#f0fdf4', color: colors.success, label: 'On Duty' },
  off_duty: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Off Duty' },
  on_leave: { bg: '#fffbeb', color: colors.warning, label: 'On Leave' },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [assignedTruck, setAssignedTruck] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError('');

    const [driverRes, statsRes, truckRes, routesRes] = await Promise.all([
      supabase.from('drivers').select('*').eq('id', id).single(),
      supabase.from('driver_stats').select('*').eq('driver_id', id).single(),
      supabase.from('trucks').select('truck_code').eq('driver_id', id).maybeSingle(),
      supabase
        .from('routes')
        .select('id, client_name, origin, destination, status, profit_loss, created_at')
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (driverRes.error) {
      setError(driverRes.error.message);
    } else {
      setDriver(driverRes.data as DriverInfo);
    }

    if (!statsRes.error) setStats(statsRes.data as DriverStats);
    if (!truckRes.error && truckRes.data) setAssignedTruck(truckRes.data.truck_code);
    if (!routesRes.error) setRoutes(routesRes.data as RouteRow[]);

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

  if (error || !driver) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Driver not found.'}</Text>
      </View>
    );
  }

  const s = statusMap[driver.status];
  const isProfit = (stats?.total_profit_loss ?? 0) >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <ArrowLeft size={18} color={colors.mutedForeground} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(driver.full_name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>{driver.full_name}</Text>
          <Text style={styles.subHeader}>{driver.driver_code}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Star size={14} color={colors.warning} />
          <Text style={styles.infoText}>{Number(driver.rating).toFixed(1)} rating</Text>
        </View>
        {driver.phone && (
          <View style={styles.infoRow}>
            <Phone size={14} color={colors.mutedForeground} />
            <Text style={styles.infoText}>{driver.phone}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>License No: {driver.license_number}   Licence Expire Date: {driver.license_expiry}</Text>
        </View>
        {assignedTruck && (
          <View style={styles.infoRow}>
            <TruckIcon size={14} color={colors.mutedForeground} />
            <Text style={styles.infoText}>Currently Assigned Truck: {assignedTruck}</Text>
          </View>
        )}
      </View>

      {/* Operational Stats */}
      <Text style={styles.sectionTitle}>Driver's Operational Statistics</Text>
      <View style={styles.operationalCard}>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Total Routes Taken:</Text>
          <Text style={styles.opValue}>{stats?.total_routes ?? 0}</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Succesful Deliveries:</Text>
          <Text style={styles.opValue}>{stats?.total_deliveries ?? 0}</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Total Routes Mileage:</Text>
          <Text style={styles.opValue}>{(stats?.total_mileage_km ?? 0).toFixed(0)} kilometres</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Total Fuel Usage:</Text>
          <Text style={styles.opValue}>{(stats?.total_fuel_liters ?? 0).toFixed(0)} Litres</Text>
        </View>
        <View style={styles.operationalItem}>
          <Text style={styles.opLabel}>Average Fuel Consumption:</Text>
          <Text style={styles.opValue}>{stats?.avg_km_per_liter?.toFixed(2) ?? '—'} Km/Litre</Text>
        </View>
      </View>

      {/* Financial Stats */}
      <Text style={styles.sectionTitle}>Driver's Operational Financial Data</Text>
      <View style={styles.card}>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Total Revenue</Text>
          <Text style={styles.finValue}>TZS {formatCurrency(stats?.total_revenue)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Fuel Cost</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(stats?.total_fuel_cost)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Road Tolls & Permits</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(stats?.total_road_tolls)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Other Expenses</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(stats?.total_other_expenses)}</Text>
        </View>
        <View style={[styles.finRow, styles.totalRow]}>
          <Text style={[styles.finLabel, styles.totalLabel]}>Total Expenses</Text>
          <Text style={[styles.finValue, styles.expenseValue, styles.totalValue]}>
            TZS {formatCurrency(stats?.total_expenses)}
          </Text>
        </View>
        <View style={[styles.finRow, styles.profitRow]}>
          <Text style={[styles.finLabel, styles.totalLabel, isProfit ? styles.profitValue : styles.lossValue]}>
            {isProfit ? 'TOTAL PROFIT' : 'LOSS'}
          </Text>
          <Text style={[styles.finValue, styles.totalValue, isProfit ? styles.profitValue : styles.lossValue]}>
            TZS {formatCurrency(stats?.total_profit_loss)}
          </Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Avg Profit/Route</Text>
          <Text style={[styles.finValue, (stats?.avg_profit_per_route ?? 0) >= 0 ? styles.profitValue : styles.lossValue]}>
            TZS {formatCurrency(stats?.avg_profit_per_route)}
          </Text>
        </View>
      </View>

      {/* Recent Routes */}
      <Text style={styles.sectionTitle}>Driver's Recent Routes</Text>
      {routes.length === 0 ? (
        <Text style={styles.emptyText}>No routes for this driver yet.</Text>
      ) : (
        routes.map((r) => {
          const positive = Number(r.profit_loss) >= 0;
          return (
            <TouchableOpacity
              key={r.id}
              style={styles.listCard}
              onPress={() => router.push(`/routes/${r.id}`)}
              activeOpacity={0.7}
            >
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
            </TouchableOpacity>
          );
        })
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  header: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  subHeader: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: colors.foreground },
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