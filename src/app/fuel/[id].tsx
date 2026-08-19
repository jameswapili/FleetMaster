import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Fuel as FuelIcon, MapPin, Truck as TruckIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type FuelLogDetail = {
  id: string;
  truck_code: string;
  liters: number;
  price_per_liter: number;
  cost: number;
  station: string | null;
  logged_date: string;
  created_at: string;
  route_id: string | null;
  route: { client_name: string; origin: string; destination: string } | null;
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

export default function FuelLogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [log, setLog] = useState<FuelLogDetail | null>(null);
  const [truckModel, setTruckModel] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError('');

    const { data, error } = await supabase
      .from('fuel_logs')
      .select('id, truck_code, liters, price_per_liter, cost, station, logged_date, created_at, route_id, route:routes(client_name, origin, destination)')
      .eq('id', id)
      .single();

    if (error) {
      setError(error.message);
    } else {
      const row = data as unknown as FuelLogDetail;
      setLog(row);

      const { data: truckData } = await supabase
        .from('trucks')
        .select('model')
        .eq('truck_code', row.truck_code)
        .maybeSingle();
      setTruckModel(truckData?.model || null);
    }

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

  if (error || !log) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Fuel log not found.'}</Text>
      </View>
    );
  }

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
        <Text style={styles.header}>
          {truckModel ? `${truckModel.toUpperCase()} - ` : ''}{log.truck_code}
        </Text>
      </View>

      {/* Truck & Date */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <TruckIcon size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>
            {truckModel ? `${truckModel.toUpperCase()} - ` : ''}{log.truck_code}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>{formatDate(log.logged_date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <FuelIcon size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>{log.station || 'Unknown station'}</Text>
        </View>
      </View>

      {/* Route */}
      {log.route ? (
        <>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.card}>
            <Text style={styles.cargoDescription}>{log.route.client_name}</Text>
            <View style={styles.infoRow}>
              <MapPin size={14} color={colors.mutedForeground} />
              <Text style={styles.infoText}>{log.route.origin} → {log.route.destination}</Text>
            </View>
          </View>
        </>
      ) : null}

      {/* Fuel details */}
      <Text style={styles.sectionTitle}>Fuel Details</Text>
      <View style={styles.card}>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Fuel Amount</Text>
          <Text style={styles.finValue}>{Number(log.liters).toFixed(0)} Liters</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Price per Liter</Text>
          <Text style={styles.finValue}>Tshs {formatCurrency(log.price_per_liter)}</Text>
        </View>
        <View style={[styles.finRow, styles.totalRow]}>
          <Text style={[styles.finLabel, styles.totalLabel]}>Total Cost</Text>
          <Text style={[styles.finValue, styles.totalValue, styles.expenseValue]}>
            Tshs {formatCurrency(log.cost)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, textAlign: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 13, color: colors.mutedForeground },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 20, fontWeight: '700', color: colors.foreground, flexShrink: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: colors.foreground },
  cargoDescription: { fontSize: 13, color: colors.foreground },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finLabel: { fontSize: 13, color: colors.mutedForeground },
  finValue: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  expenseValue: { color: colors.destructive },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontWeight: '700', color: colors.foreground },
  totalValue: { fontSize: 14, fontWeight: '700' },
});