import { AlertTriangle, Fuel, Info, MapPin, TrendingDown, TrendingUp, Truck, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 64;

type TruckRow = { id: string; truck_code: string; model: string; status: string; driver_id: string | null };
type RouteRow = {
  id: string;
  status: string;
  created_at: string;
  client_name: string;
  origin: string;
  destination: string;
  profit_loss: number;
};
type FuelRow = { id: string; liters: number; cost: number; logged_at: string; truck_code: string };

type Alert = { level: 'critical' | 'warning' | 'info'; text: string };
type ActivityItem = { text: string; time: Date };

const formatCurrency = (value: number): string =>
  Math.round(value).toLocaleString('en-US', { maximumFractionDigits: 0 });

function getLastNMonths(n: number) {
  const arr: { key: string; label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return arr;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  up,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  trend?: string;
  up?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statIconWrap}>
          <Icon size={16} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
      {trend ? (
        <View style={styles.trendRow}>
          {up ? <TrendingUp size={12} color={colors.success} /> : <TrendingDown size={12} color={colors.destructive} />}
          <Text style={[styles.trendText, { color: up ? colors.success : colors.destructive }]}>{trend}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelRow[]>([]);

  const fetchData = useCallback(async () => {
    setError('');
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);
    const cutoff = sevenMonthsAgo.toISOString();

    const [trucksRes, driversRes, routesRes, fuelRes] = await Promise.all([
      supabase.from('trucks').select('id, truck_code, model, status, driver_id'),
      supabase.from('drivers').select('id'),
      supabase
        .from('routes')
        .select('id, status, created_at, client_name, origin, destination, profit_loss')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false }),
      supabase
        .from('fuel_logs')
        .select('id, liters, cost, logged_at, truck_code')
        .gte('logged_at', cutoff)
        .order('logged_at', { ascending: false }),
    ]);

    if (trucksRes.error) setError(trucksRes.error.message);
    else setTrucks(trucksRes.data as TruckRow[]);

    if (!driversRes.error) setTotalDrivers((driversRes.data || []).length);
    if (!routesRes.error) setRoutes(routesRes.data as RouteRow[]);
    if (!fuelRes.error) setFuelLogs(fuelRes.data as FuelRow[]);

    setLoading(false);
    setRefreshing(false);
  }, []);

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
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // ---- Derived stats ----
  const activeCount = trucks.filter((t) => t.status === 'active').length;
  const driversOnDuty = trucks.filter((t) => t.status === 'active' && t.driver_id).length;

  const todayStr = new Date().toDateString();
  const routesToday = routes.filter((r) => new Date(r.created_at).toDateString() === todayStr);
  const deliveredToday = routesToday.filter((r) => r.status === 'delivered' || r.status === 'completed').length;
  const inTransitToday = routesToday.filter((r) => r.status === 'in_transit').length;

  const months = getLastNMonths(7);
  const currentMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];

  const tripsChartData = months.map((m) => ({
    value: routes.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length,
    label: m.label,
    frontColor: '#fca5a5',
  }));

  const fuelChartData = months.map((m) => ({
    value: fuelLogs
      .filter((f) => {
        const d = new Date(f.logged_at);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, f) => sum + Number(f.liters), 0),
    label: m.label,
  }));

  const tripsThisMonth = tripsChartData[tripsChartData.length - 1].value;
  const tripsLastMonth = tripsChartData[tripsChartData.length - 2].value;
  const tripsTrendPct = tripsLastMonth > 0 ? (((tripsThisMonth - tripsLastMonth) / tripsLastMonth) * 100).toFixed(1) : null;

  const fuelCostThisMonth = fuelLogs
    .filter((f) => {
      const d = new Date(f.logged_at);
      return d.getFullYear() === currentMonth.year && d.getMonth() === currentMonth.month;
    })
    .reduce((sum, f) => sum + Number(f.cost), 0);
  const fuelCostLastMonth = fuelLogs
    .filter((f) => {
      const d = new Date(f.logged_at);
      return d.getFullYear() === lastMonth.year && d.getMonth() === lastMonth.month;
    })
    .reduce((sum, f) => sum + Number(f.cost), 0);
  const fuelTrendPct =
    fuelCostLastMonth > 0 ? (((fuelCostThisMonth - fuelCostLastMonth) / fuelCostLastMonth) * 100).toFixed(1) : null;

  const statCards = [
    {
      icon: Truck,
      label: 'ACTIVE FLEET',
      value: `${activeCount} / ${trucks.length}`,
      sub: 'Trucks currently active',
    },
    {
      icon: Users,
      label: 'DRIVERS ON DUTY',
      value: `${driversOnDuty} / ${totalDrivers}`,
      sub: 'Assigned to active trucks',
    },
    {
      icon: MapPin,
      label: 'TRIPS TODAY',
      value: `${routesToday.length}`,
      sub: `${deliveredToday} delivered · ${inTransitToday} in transit`,
      trend: tripsTrendPct != null ? `${tripsTrendPct}% vs last month` : undefined,
      up: tripsTrendPct != null ? Number(tripsTrendPct) >= 0 : undefined,
    },
    {
      icon: Fuel,
      label: 'FUEL COST (MTD)',
      value: `TZS ${formatCurrency(fuelCostThisMonth)}`,
      sub: currentMonth.label,
      trend: fuelTrendPct != null ? `${fuelTrendPct}% vs last month` : undefined,
      up: fuelTrendPct != null ? Number(fuelTrendPct) < 0 : undefined,
    },
  ];

  const fleetStatus = [
    { value: activeCount, color: colors.chart3, text: 'Active', count: activeCount },
    { value: trucks.filter((t) => t.status === 'idle').length, color: '#94a3b8', text: 'Idle', count: trucks.filter((t) => t.status === 'idle').length },
    { value: trucks.filter((t) => t.status === 'maintenance').length, color: colors.chart2, text: 'Maintenance', count: trucks.filter((t) => t.status === 'maintenance').length },
    { value: trucks.filter((t) => t.status === 'breakdown').length, color: colors.chart5, text: 'Breakdown', count: trucks.filter((t) => t.status === 'breakdown').length },
  ];

  // ---- Alerts ----
  const alerts: Alert[] = [];
  trucks
    .filter((t) => t.status === 'breakdown')
    .forEach((t) => alerts.push({ level: 'critical', text: `${t.truck_code} (${t.model}) is marked as breakdown.` }));
  trucks
    .filter((t) => t.status === 'maintenance')
    .forEach((t) => alerts.push({ level: 'warning', text: `${t.truck_code} (${t.model}) is under maintenance.` }));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  routes
    .filter((r) => Number(r.profit_loss) < 0 && new Date(r.created_at) >= thirtyDaysAgo)
    .slice(0, 5)
    .forEach((r) =>
      alerts.push({
        level: 'warning',
        text: `Route "${r.client_name}" (${r.origin} → ${r.destination}) is running at a loss: TZS ${formatCurrency(Math.abs(r.profit_loss))}.`,
      })
    );

  // ---- Recent activity ----
  const activity: ActivityItem[] = [
    ...routes.slice(0, 5).map((r) => ({
      text: `New route created: ${r.client_name} (${r.origin} → ${r.destination})`,
      time: new Date(r.created_at),
    })),
    ...fuelLogs.slice(0, 5).map((f) => ({
      text: `Fuel logged: ${f.liters} L for ${f.truck_code} — TZS ${formatCurrency(f.cost)}`,
      time: new Date(f.logged_at),
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>Dashboard</Text>

      <View style={styles.statsGrid}>
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fuel Consumption</Text>
        <Text style={styles.cardSubtitle}>Last 7 months (litres)</Text>
        <LineChart
          data={fuelChartData}
          width={chartWidth}
          height={180}
          color={colors.accent}
          thickness={2}
          curved
          hideDataPoints
          yAxisTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
          noOfSections={4}
          rulesColor={colors.border}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fleet Status</Text>
        <Text style={styles.cardSubtitle}>{trucks.length} vehicles total</Text>
        <View style={styles.donutRow}>
          <PieChart data={fleetStatus} donut radius={70} innerRadius={45} />
          <View style={styles.legend}>
            {fleetStatus.map((f, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: f.color }]} />
                <Text style={styles.legendText}>{f.text}</Text>
                <Text style={styles.legendCount}>{f.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Trips</Text>
        <Text style={styles.cardSubtitle}>Routes created — last 7 months</Text>
        <BarChart
          data={tripsChartData}
          width={chartWidth}
          height={180}
          barWidth={20}
          spacing={18}
          roundedTop
          yAxisTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.mutedForeground, fontSize: 10 }}
          noOfSections={4}
          rulesColor={colors.border}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        {activity.length === 0 ? (
          <Text style={styles.emptyText}>No recent activity.</Text>
        ) : (
          activity.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              <Text style={styles.activityText}>{a.text}</Text>
              <Text style={styles.activityTime}>
                {a.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Alerts & Warnings</Text>
        </View>
        <Text style={styles.cardSubtitle}>{alerts.length} active</Text>
        {alerts.length === 0 ? (
          <Text style={styles.emptyText}>No active alerts.</Text>
        ) : (
          alerts.map((a, i) => {
            const bg = a.level === 'critical' ? '#fef2f2' : a.level === 'warning' ? '#fffbeb' : '#eff6ff';
            const iconColor = a.level === 'critical' ? colors.destructive : a.level === 'warning' ? colors.warning : colors.info;
            return (
              <View key={i} style={[styles.alertBox, { backgroundColor: bg }]}>
                {a.level === 'info' ? <Info size={16} color={iconColor} /> : <AlertTriangle size={16} color={iconColor} />}
                <Text style={styles.alertText}>{a.text}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, textAlign: 'center' },
  emptyText: { fontSize: 12, color: colors.mutedForeground, marginTop: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  statCard: { width: (screenWidth - 16 * 2 - 12) / 2, backgroundColor: colors.card, borderRadius: radius, padding: 14 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.5 },
  statIconWrap: { backgroundColor: colors.secondary, borderRadius: 8, padding: 6 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.foreground, marginTop: 8 },
  statSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  trendText: { fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  cardSubtitle: { fontSize: 12, color: colors.mutedForeground, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.foreground, flex: 1 },
  legendCount: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { fontSize: 11, color: colors.success, fontWeight: '600' },
  activityRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  activityText: { fontSize: 12, color: colors.foreground },
  activityTime: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  alertBox: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 8, marginTop: 8 },
  alertText: { fontSize: 12, color: colors.foreground, flex: 1 },
});