import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type TruckStats = {
  truck_id: string;
  truck_code: string;
  model: string;

  // 📊 Route Counts
  total_routes: number;
  total_deliveries: number;

  // 📏 Distance & Fuel
  total_mileage_km: number;
  total_fuel_liters: number;
  avg_km_per_liter: number;

  // 💰 Financial Stats
  total_revenue: number;
  total_expenses: number;
  total_profit_loss: number;
  avg_profit_per_route: number;
  total_fuel_cost: number;

  // 🆕 Expense Breakdown
  total_road_tolls: number;
  total_other_expenses: number;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export default function TruckStatsScreen() {
  const [loading, setLoading] = useState(true);
  const [trucks, setTrucks] = useState<TruckStats[]>([]);
  const [error, setError] = useState('');

  const fetchTruckStats = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('truck_stats')
      .select('*')
      .order('truck_code');

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setTrucks(data as TruckStats[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTruckStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📊 Truck Statistics</Text>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : trucks.length === 0 ? (
        <Text style={styles.emptyText}>No truck statistics found.</Text>
      ) : (
        trucks.map((truck) => (
          <TouchableOpacity
            key={truck.truck_id}
            style={styles.truckCard}
            onPress={() => router.push(`/trucks/${truck.truck_id}`)}
            activeOpacity={0.7}
          >
            {/* Truck Header */}
            <View style={styles.truckHeader}>
              <Text style={styles.truckCode}>{truck.model} - {truck.truck_code}</Text>
            </View>

            {/* Section 1: Operational Stats */}
            <Text style={styles.sectionTitle}>Operational</Text>
            <View style={styles.operationalCard}>
              <View style={styles.operationalItem}>
                <Text style={styles.opLabel}>Routes Taken:</Text>
                <Text style={styles.opValue}>{truck.total_routes}</Text>
              </View>
              <View style={styles.operationalItem}>
                <Text style={styles.opLabel}>Successful Deliveries:</Text>
                <Text style={styles.opValue}>{truck.total_deliveries}</Text>
              </View>
              <View style={styles.operationalItem}>
                <Text style={styles.opLabel}>Total Routes Mileage:</Text>
                <Text style={styles.opValue}>{truck.total_mileage_km.toFixed(0)} Kilometres</Text>
              </View>
              <View style={styles.operationalItem}>
                <Text style={styles.opLabel}>Total Fuel Consumption:</Text>
                <Text style={styles.opValue}>{truck.total_fuel_liters.toFixed(0)} Litres</Text>
              </View>
              <View style={styles.operationalItem}>
                <Text style={styles.opLabel}>Average Fuel Consumption:</Text>
                <Text style={styles.opValue}>{truck.avg_km_per_liter.toFixed(2)} kilometres/litre</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Section 2: Financial Stats */}
            <Text style={styles.sectionTitle}>💰 Financial</Text>
            <View style={styles.financialGrid}>

              {/* Total Revenue */}
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Total Revenue</Text>
                <Text style={styles.finValue}>TZS {formatCurrency(truck.total_revenue)}</Text>
              </View>

              {/* Total Fuel Cost */}
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Total Fuel Cost</Text>
                <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(truck.total_fuel_cost)}</Text>
              </View>

              {/* Total Road Tolls & Permits */}
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Road Tolls & Permits</Text>
                <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(truck.total_road_tolls)}</Text>
              </View>

              {/* Total Other Expenses */}
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Other Expenses</Text>
                <Text style={[styles.finValue, styles.expenseValue]}>TZS {formatCurrency(truck.total_other_expenses)}</Text>
              </View>

              {/* Total Expenses */}
              <View style={[styles.finRow, styles.totalRow]}>
                <Text style={[styles.finLabel, styles.totalLabel]}>Total Expenses</Text>
                <Text style={[styles.finValue, styles.expenseValue, styles.totalValue]}>
                  TZS {formatCurrency(truck.total_expenses)}
                </Text>
              </View>

              {/* Total Profit/Loss */}
              <View style={[styles.finRow, styles.profitRow]}>
                <Text style={[
                  styles.finLabel,
                  styles.totalLabel,
                  truck.total_profit_loss >= 0 ? styles.profitValue : styles.lossValue
                ]}>
                  {truck.total_profit_loss >= 0 ? 'TOTAL PROFIT' : 'LOSS'}
                </Text>
                <Text style={[
                  styles.finValue,
                  styles.totalValue,
                  truck.total_profit_loss >= 0 ? styles.profitValue : styles.lossValue
                ]}>
                  TZS {formatCurrency(truck.total_profit_loss)}
                </Text>
              </View>

              {/* Avg Profit per Route */}
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Avg Profit/Route</Text>
                <Text style={[
                  styles.finValue,
                  truck.avg_profit_per_route >= 0 ? styles.profitValue : styles.lossValue
                ]}>
                  TZS {formatCurrency(truck.avg_profit_per_route)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 20,
  },
  errorText: {
    color: colors.destructive,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    marginTop: 20,
  },
  truckCard: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 16,
    marginBottom: 16,
  },
  truckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  truckCode: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  truckModel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 10,
  },
  operationalCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.background,
    borderRadius: radius,
    paddingVertical: 10,
    paddingHorizontal: 12,
    columnGap: 14,
    rowGap: 8,
  },
  operationalItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  opLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  opValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  statsList: {
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  financialGrid: {
    gap: 4,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  finLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  finValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  expenseValue: {
    color: colors.destructive,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: '700',
    color: colors.foreground,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  profitRow: {
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  profitValue: {
    color: colors.success,
  },
  lossValue: {
    color: colors.destructive,
  },
});