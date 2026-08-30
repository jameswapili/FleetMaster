import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, MapPin, Package, Truck as TruckIcon, User } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type RouteDetail = {
  id: string;
  client_name: string;
  origin: string;
  destination: string;
  distance_km: number | null;
  status: 'planned' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  cargo_description: string | null;
  cargo_type: string | null;
  cargo_type_description: string | null;
  cargo_package: string | null;
  cargo_class: string | null;
  cargo_weight_kg: number | null;
  route_price: number;
  fuel_cost: number;
  driver_allowance: number;
  road_tolls_permits: number;
  road_tolls_permits_description: string | null;
  other_expenses: number;
  other_expenses_description: string | null;
  total_expenses: number;
  profit_loss: number;
  created_at: string;
  driver: { id: string; full_name: string } | null;
  truck: { id: string; truck_code: string; model: string } | null;
};

type FuelLogRow = {
  id: string;
  liters: number;
  price_per_liter: number;
  cost: number;
  station: string | null;
  logged_date: string;
  truck_code: string;
};

const statusMap = {
  planned: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Planned' },
  in_transit: { bg: '#eff6ff', color: colors.info, label: 'In Transit' },
  delivered: { bg: '#fff7ed', color: colors.accent, label: 'Delivered' },
  completed: { bg: '#f0fdf4', color: colors.success, label: 'Completed' },
  cancelled: { bg: '#fef2f2', color: colors.destructive, label: 'Cancelled' },
};

const cargoTypes: Record<string, string> = {
  transit: 'Transit',
  local: 'Local',
  town_trip: 'Town Trip',
};
const cargoPackages: Record<string, string> = {
  loose: 'Loose Cargo',
  container_20ft: '20ft Container',
  container_40ft: '40ft Container',
  tanker: 'Tanker',
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [fuelLogs, setFuelLogs] = useState<FuelLogRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError('');

    const [routeRes, fuelRes] = await Promise.all([
      supabase
        .from('routes')
        .select('*, driver:drivers(id, full_name), truck:trucks(id, truck_code, model)')
        .eq('id', id)
        .single(),

      supabase
  .from('fuel_logs')
  .select('id, liters, price_per_liter, cost, station, logged_date, truck_code')
  .eq('route_id', id)
  .order('logged_date', { ascending: false }),
    ]);

    if (routeRes.error) {
      setError(routeRes.error.message);
    } else {
      setRoute(routeRes.data as unknown as RouteDetail);
    }

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

  if (error || !route) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Route not found.'}</Text>
      </View>
    );
  }

  const s = statusMap[route.status];
  const positive = Number(route.profit_loss) >= 0;

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
        <Text style={styles.header}>{route.client_name}</Text>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Route path */}
      <View style={styles.pathRow}>
        <MapPin size={13} color={positive ? colors.success : colors.destructive} />
        <Text style={[styles.pathText, { color: positive ? colors.success : colors.destructive }]}>
          {route.origin}
        </Text>
        <ArrowRight size={13} color={positive ? colors.success : colors.destructive} />
        <Text style={[styles.pathText, { color: positive ? colors.success : colors.destructive }]}>
          {route.destination}
        </Text>
        {route.distance_km != null && (
          <Text style={[styles.pathText, { color: positive ? colors.success : colors.destructive }]}>
            · {route.distance_km} km
          </Text>
        )}
      </View>

      {/* Driver & Truck */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <User size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>Driver: {route.driver?.full_name || 'Unassigned'}</Text>
        </View>
        <View style={styles.infoRow}>
          <TruckIcon size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>Truck: {route.truck ? `${route.truck.model.toUpperCase()} - ${route.truck.truck_code}` : 'Unassigned'}
          </Text>
        </View>
      </View>

      {/* Cargo */}
      <Text style={styles.sectionTitle}>Cargo Details</Text>
      <View style={styles.card}>
        {route.cargo_description ? (
          <Text style={styles.cargoDescription}>{route.cargo_description}</Text>
        ) : null}
        <View style={styles.infoRow}>
          <Package size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>
            {cargoTypes[route.cargo_type || ''] || '—'}
            {route.cargo_package ? ` · ${cargoPackages[route.cargo_package]}` : ''}
            {route.cargo_weight_kg ? ` · ${route.cargo_weight_kg} kg` : ''}
            {route.cargo_class === 'abnormal_wide_load' ? ' · Abnormal Load' : ''}
          </Text>
        </View>
        {route.cargo_type_description ? (
          <Text style={styles.cargoNote}>{route.cargo_type_description}</Text>
        ) : null}
      </View>

      {/* Financials */}
      <Text style={styles.sectionTitle}>Financial</Text>
      <View style={styles.card}>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Route Price</Text>
          <Text style={styles.finValue}>TZS {formatCurrency(route.route_price)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Fuel Cost</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(route.fuel_cost)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Driver Allowance</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(route.driver_allowance)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Road Tolls & Permits</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(route.road_tolls_permits)}</Text>
        </View>
        {route.road_tolls_permits_description ? (
          <Text style={styles.finNote}>{route.road_tolls_permits_description}</Text>
        ) : null}
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Other Expenses</Text>
          <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(route.other_expenses)}</Text>
        </View>
        {route.other_expenses_description ? (
          <Text style={styles.finNote}>{route.other_expenses_description}</Text>
        ) : null}

        <View style={[styles.finRow, styles.totalRow]}>
          <Text style={[styles.finLabel, styles.totalLabel]}>Total Expenses</Text>
          <Text style={[styles.finValue, styles.expenseValue, styles.totalValue]}>
            TZS {formatCurrency(route.total_expenses)}
          </Text>
        </View>

        <View style={[styles.finRow, styles.profitRow]}>
          <Text style={[styles.finLabel, styles.totalLabel, positive ? styles.profitValue : styles.lossValue]}>
            {positive ? 'PROFIT' : 'LOSS'}
          </Text>
          <Text style={[styles.finValue, styles.totalValue, positive ? styles.profitValue : styles.lossValue]}>
            TZS {formatCurrency(route.profit_loss)}
          </Text>
        </View>
      </View>

      {/* Fuel logs for this route */}
      <Text style={styles.sectionTitle}>Route Fuel Logs</Text>
      {fuelLogs.length === 0 ? (
        <Text style={styles.emptyText}>No fuel logs recorded for this route.</Text>
      ) : (
        fuelLogs.map((f) => (
  <View key={f.id} style={styles.listCard}>
    <View style={styles.rowBetween}>
      <Text style={styles.listCardTitle}>Fuel fill-up: {f.liters.toFixed(0)} Liters @ Tshs {formatCurrency(f.price_per_liter)} per Liter </Text>
    </View>
    <Text style={styles.listCardAmount}>Total Cost: Tshs {formatCurrency(f.cost)}</Text>
    <Text style={styles.pathText}>
      Station: {f.station || 'Unknown station'}
    </Text>
    <Text style={styles.pathText}>
  Date: {new Date(f.logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
</Text> 
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  header: { fontSize: 20, fontWeight: '700', color: colors.foreground, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  pathText: { fontSize: 12, color: colors.foreground },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: colors.foreground },
  cargoDescription: { fontSize: 13, color: colors.foreground },
  cargoNote: { fontSize: 12, color: colors.mutedForeground, fontStyle: 'italic' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finLabel: { fontSize: 13, color: colors.mutedForeground },
  finValue: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  finNote: { fontSize: 11, color: colors.mutedForeground, fontStyle: 'italic', marginTop: -4, marginBottom: 2 },
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
});