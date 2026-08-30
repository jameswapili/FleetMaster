import { router } from 'expo-router';
import { AlertTriangle, Fuel, Info, MapPin, TrendingDown, TrendingUp, Truck, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

const screenWidth = Dimensions.get('window').width;

type TruckRow = { id: string; truck_code: string; model: string; status: string; driver_id: string | null };
type RouteRow = {
  id: string;
  status: string;
  created_at: string;
  client_name: string;
  origin: string;
  destination: string;
  profit_loss: number;
  distance_km: number | null;
  driver_allowance: number;
  driver_acknowledged: boolean;
  acknowledged_at: string | null;
  started_at: string | null;
  driver: { full_name: string } | null;
  truck: { truck_code: string } | null;
};

type FuelRow = { id: string; liters: number; cost: number; logged_date: string; truck_code: string; route_id: string | null; station: string | null };
type StatsRouteRow = { id: string; status: string; distance_km: number | null; driver_allowance: number };

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
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelRow[]>([]);
  const [allRoutesForStats, setAllRoutesForStats] = useState<StatsRouteRow[]>([]);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const isDriver = profile?.department === 'driver';

  const fetchData = useCallback(async () => {
    setError('');

    if (isDriver) {
      const [trucksRes, latestRouteRes, allRoutesRes] = await Promise.all([
        supabase.from('trucks').select('id, truck_code, model, status, driver_id'),
        supabase
          .from('routes')
          .select('id, status, created_at, client_name, origin, destination, profit_loss, distance_km, driver_allowance, driver_acknowledged, acknowledged_at, started_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('routes').select('id, status, distance_km, driver_allowance'),
      ]);

      if (!trucksRes.error) setTrucks(trucksRes.data as TruckRow[]);

      const latestRoute = latestRouteRes.data as RouteRow | null;
      setRoutes(latestRoute ? [latestRoute] : []);

      const allRoutes = (allRoutesRes.data as StatsRouteRow[]) || [];
      setAllRoutesForStats(allRoutes);

      const routeIds = allRoutes.map((r) => r.id);
      if (routeIds.length > 0) {
        const fuelRes = await supabase
          .from('fuel_logs')
          .select('id, liters, cost, logged_date, truck_code, route_id, station')
          .in('route_id', routeIds)
          .order('logged_date', { ascending: false });
        if (!fuelRes.error) setFuelLogs(fuelRes.data as FuelRow[]);
      } else {
        setFuelLogs([]);
      }

      setLoading(false);
      setRefreshing(false);
      return;
    }

    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);
    const cutoff = sevenMonthsAgo.toISOString();

    const needsFleet = ['admin', 'operations', 'maintenance'].includes(profile?.department || '');
    const needsFinance = ['admin', 'finance'].includes(profile?.department || '');

    const [trucksRes, driversRes, routesRes, fuelRes] = await Promise.all([
      needsFleet
        ? supabase.from('trucks').select('id, truck_code, model, status, driver_id')
        : Promise.resolve({ data: [], error: null }),
      needsFleet ? supabase.from('drivers').select('id') : Promise.resolve({ data: [], error: null }),
      supabase
        .from('routes')
        .select('id, status, created_at, client_name, origin, destination, profit_loss, acknowledged_at, started_at, driver:drivers(full_name), truck:trucks(truck_code)')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(300),
      needsFinance
        ? supabase
            .from('fuel_logs')
            .select('id, liters, cost, logged_date, truck_code')
            .gte('logged_date', cutoff)
            .order('logged_date', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (trucksRes.error) setError(trucksRes.error.message);
    else setTrucks(trucksRes.data as TruckRow[]);
    if (!driversRes.error) setTotalDrivers((driversRes.data || []).length);
    if (!routesRes.error) setRoutes(routesRes.data as unknown as RouteRow[]);
    if (!fuelRes.error) setFuelLogs(fuelRes.data as FuelRow[]);

    setLoading(false);
    setRefreshing(false);
  }, [profile?.department, isDriver]);

  useEffect(() => {
    if (profile) fetchData();
  }, [fetchData, profile]);

  useEffect(() => {
    if (isDriver) return;
    const channel = supabase
      .channel('routes-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'routes' },
        (payload: any) => {
          if (payload.new.status === 'in_transit' && payload.old.status !== 'in_transit') {
            setLiveAlert(`${payload.new.client_name} just started their journey`);
            setTimeout(() => setLiveAlert(null), 8000);
          } else if (payload.new.driver_acknowledged && !payload.old.driver_acknowledged) {
            setLiveAlert(`Driver acknowledged route: ${payload.new.client_name}`);
            setTimeout(() => setLiveAlert(null), 8000);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDriver]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading || !profile) {
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

  // ---- DRIVER VIEW ----
  if (isDriver) {
    const myTruck = trucks.find((t) => t.driver_id === profile.driver_id && profile.driver_id != null) || null;
    const latestRoute = routes[0] || null;
    const currentRouteFuelLogs = latestRoute ? fuelLogs.filter((f) => f.route_id === latestRoute.id) : [];

    const totalRoutes = allRoutesForStats.length;
    const totalDeliveries = allRoutesForStats.filter((r) => r.status === 'delivered' || r.status === 'completed').length;
    const totalAllowance = allRoutesForStats.reduce((sum, r) => sum + (Number(r.driver_allowance) || 0), 0);
    const totalMileage = allRoutesForStats.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0);
    const totalFuelLiters = fuelLogs.reduce((sum, f) => sum + Number(f.liters), 0);
    const totalFuelCost = fuelLogs.reduce((sum, f) => sum + Number(f.cost), 0);
    const avgKmPerLiter = totalFuelLiters > 0 ? (totalMileage / totalFuelLiters).toFixed(2) : '0.00';

    const acknowledgeRoute = async () => {
      if (!latestRoute) return;
      await supabase.from('routes').update({ driver_acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('id', latestRoute.id);
      fetchData();
    };

    const startJourney = async () => {
      if (!latestRoute) return;
      await supabase.from('routes').update({ status: 'in_transit', started_at: new Date().toISOString() }).eq('id', latestRoute.id);
      fetchData();
    };

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.pageTitle}>Welcome, {profile.full_name}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Truck</Text>
          {myTruck ? (
            <Text style={styles.infoText}>{myTruck.model.toUpperCase()} - {myTruck.truck_code} · {myTruck.status}</Text>
          ) : (
            <Text style={styles.emptyText}>No truck currently assigned.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/(driver)/maintenance-request' as any)}>
          <Text style={styles.buttonText}>Request Maintenance</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Route</Text>
          {latestRoute ? (
            <>
              <Text style={styles.infoText}>{latestRoute.client_name} ({latestRoute.origin} → {latestRoute.destination})</Text>
              <Text style={styles.driverSmallSub}>{latestRoute.status}{latestRoute.distance_km ? ` · ${latestRoute.distance_km} km` : ''}</Text>
              <Text style={styles.driverSmallSub}>Allowance: TZS {formatCurrency(latestRoute.driver_allowance)}</Text>

              {!latestRoute.driver_acknowledged && (
                <TouchableOpacity style={styles.ackButton} onPress={acknowledgeRoute}>
                  <Text style={styles.buttonText}>Acknowledge New Route</Text>
                </TouchableOpacity>
              )}

              {latestRoute.driver_acknowledged && latestRoute.status === 'planned' && (
                <TouchableOpacity style={styles.startButton} onPress={startJourney}>
                  <Text style={styles.buttonText}>Start Journey</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No route assigned yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fuel Logs (Current Route)</Text>
          {currentRouteFuelLogs.length === 0 ? (
            <Text style={styles.emptyText}>No fuel logs for this route yet.</Text>
          ) : (
            currentRouteFuelLogs.map((f) => (
              <View key={f.id} style={styles.activityRow}>
                <Text style={styles.activityText}>{f.liters} Liters</Text>
                <Text style={styles.activityTime}>{f.station || 'Unknown station'} · {new Date(f.logged_date).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.driverStatsGrid}>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>TOTAL ROUTES</Text>
            <Text style={styles.driverStatValue}>{totalRoutes}</Text>
          </View>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>TOTAL DELIVERIES</Text>
            <Text style={styles.driverStatValue}>{totalDeliveries}</Text>
          </View>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>TOTAL MILEAGE</Text>
            <Text style={styles.driverStatValue}>{totalMileage.toLocaleString()} km</Text>
          </View>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>TOTAL FUEL USED</Text>
            <Text style={styles.driverStatValue}>{totalFuelLiters.toLocaleString()} Liters</Text>
          </View>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>FUEL CONSUMPTION</Text>
            <Text style={styles.driverStatValue}>{avgKmPerLiter} km/l</Text>
          </View>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>TOTAL FUEL COST</Text>
            <Text style={styles.driverStatValue}>Tshs {formatCurrency(totalFuelCost)}</Text>
          </View>
          <View style={styles.driverStatCard}>
            <Text style={styles.driverStatLabel}>TOTAL ALLOWANCE</Text>
            <Text style={styles.driverStatValue}>Tshs {formatCurrency(totalAllowance)}</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ---- FLEET-WIDE VIEW ----
  const activeCount = trucks.filter((t) => t.status === 'active').length;
  const driversOnDuty = trucks.filter((t) => t.status === 'active' && t.driver_id).length;

  const todayStr = new Date().toDateString();
  const routesToday = routes.filter((r) => new Date(r.created_at).toDateString() === todayStr);
  const deliveredToday = routesToday.filter((r) => r.status === 'delivered' || r.status === 'completed').length;
  const inTransitToday = routesToday.filter((r) => r.status === 'in_transit').length;

  const months = getLastNMonths(7);
  const currentMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];

  const fuelCostThisMonth = fuelLogs
    .filter((f) => {
      const d = new Date(f.logged_date);
      return d.getFullYear() === currentMonth.year && d.getMonth() === currentMonth.month;
    })
    .reduce((sum, f) => sum + Number(f.cost), 0);
  const fuelCostLastMonth = fuelLogs
    .filter((f) => {
      const d = new Date(f.logged_date);
      return d.getFullYear() === lastMonth.year && d.getMonth() === lastMonth.month;
    })
    .reduce((sum, f) => sum + Number(f.cost), 0);
  const fuelTrendPct =
    fuelCostLastMonth > 0 ? (((fuelCostThisMonth - fuelCostLastMonth) / fuelCostLastMonth) * 100).toFixed(1) : null;

  const dept = profile.department || '';
  const showFleetWidgets = ['admin', 'operations', 'maintenance'].includes(dept);
  const showFinanceWidgets = ['admin', 'finance'].includes(dept);

  const statCards = [
    showFleetWidgets && {
      icon: Truck,
      label: 'ACTIVE FLEET',
      value: `${activeCount} / ${trucks.length}`,
      sub: 'Trucks currently active',
    },
    showFleetWidgets && {
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
    },
    showFinanceWidgets && {
      icon: Fuel,
      label: 'FUEL COST (MTD)',
      value: `TZS ${formatCurrency(fuelCostThisMonth)}`,
      sub: currentMonth.label,
      trend: fuelTrendPct != null ? `${fuelTrendPct}% vs last month` : undefined,
      up: fuelTrendPct != null ? Number(fuelTrendPct) < 0 : undefined,
    },
  ].filter(Boolean) as any[];

  const fleetStatus = [
    { value: activeCount, color: colors.chart3, text: 'Active', count: activeCount },
    { value: trucks.filter((t) => t.status === 'idle').length, color: colors.chart4, text: 'Idle', count: trucks.filter((t) => t.status === 'idle').length },
    { value: trucks.filter((t) => t.status === 'maintenance').length, color: colors.chart2, text: 'Maintenance', count: trucks.filter((t) => t.status === 'maintenance').length },
    { value: trucks.filter((t) => t.status === 'breakdown').length, color: colors.chart5, text: 'Breakdown', count: trucks.filter((t) => t.status === 'breakdown').length },
  ];

  const alerts: Alert[] = [];
  if (showFleetWidgets) {
    trucks
      .filter((t) => t.status === 'breakdown')
      .forEach((t) => alerts.push({ level: 'critical', text: `${t.truck_code} (${t.model}) is marked as breakdown.` }));
    trucks
      .filter((t) => t.status === 'maintenance')
      .forEach((t) => alerts.push({ level: 'warning', text: `${t.truck_code} (${t.model}) is under maintenance.` }));
  }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (showFinanceWidgets) {
    routes
      .filter((r) => Number(r.profit_loss) < 0 && new Date(r.created_at) >= thirtyDaysAgo)
      .slice(0, 5)
      .forEach((r) =>
        alerts.push({
          level: 'warning',
          text: `Route "${r.client_name}" (${r.origin} → ${r.destination}) is running at a loss: TZS ${formatCurrency(Math.abs(r.profit_loss))}.`,
        })
      );
  }

  const activity: ActivityItem[] = [
    ...routes.slice(0, 5).map((r) => ({
      text: `NEW ROUTE REGISTERED: ${r.client_name} 
      (${r.origin} → ${r.destination})`,
      time: new Date(r.created_at),
    })),
    ...routes
      .filter((r) => r.acknowledged_at)
      .slice(0, 5)
      .map((r) => ({
        text: `TRUCK: ${r.truck?.truck_code || 'truck'}-DRIVER: ${r.driver?.full_name || 'driver'} has acknowledged the route ${r.client_name} from ${r.origin} →  ${r.destination}`,
        time: new Date(r.acknowledged_at as string),
      })),
    ...routes
      .filter((r) => r.started_at)
      .slice(0, 5)
      .map((r) => ({
        text: `TRUCK: ${r.truck?.truck_code || 'truck'}-DRIVER: ${r.driver?.full_name || 'driver'} has started the journey: ${r.client_name} from ${r.origin} → ${r.destination})`,
        time: new Date(r.started_at as string),
      })),
    ...(showFinanceWidgets
      ? fuelLogs.slice(0, 5).map((f) => ({
          text: `Fuel logged: ${f.liters} L for ${f.truck_code} — TZS ${formatCurrency(f.cost)}`,
          time: new Date(f.logged_date),
        }))
      : []),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 10);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 10, paddingBottom: 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>My Dashboard</Text>

      {liveAlert && (
        <View style={styles.liveAlertBanner}>
          <Text style={styles.liveAlertText}>{liveAlert}</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </View>

      {showFleetWidgets && (
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
      )}

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
              
                <Text style={styles.activityText}>
        {a.text}
        </Text>
              
              <Text style={styles.activityTime}>
                {a.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </View>

      {showFleetWidgets && (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  infoText: { fontSize: 13, color: colors.foreground },
  activityTextGreen: { color: colors.success },
  liveAlertBanner: { backgroundColor: '#dbeafe', borderRadius: radius, padding: 12, marginBottom: 12 },
  liveAlertText: { fontSize: 13, color: colors.info, fontWeight: '600' },
  ackButton: { backgroundColor: colors.warning, borderRadius: radius, padding: 10, alignItems: 'center', marginTop: 8 },
  startButton: { backgroundColor: colors.success, borderRadius: radius, padding: 10, alignItems: 'center', marginTop: 8 },
  driverSmallSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  driverStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'center' },
  driverStatCard: { width: (screenWidth - 16 * 2 - 8 * 2) / 3, backgroundColor: colors.card, borderRadius: radius, padding: 10 },
  driverStatLabel: { fontSize: 9, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.3 },
  driverStatValue: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 4 },
  button: { backgroundColor: colors.primary, borderRadius: radius, padding: 14, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorText: { color: colors.destructive, textAlign: 'center' },
  emptyText: { fontSize: 12, color: colors.mutedForeground, marginTop: 8 },
  pageTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
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
  cardTitle: { fontSize: 15, fontWeight: '300', color: colors.foreground },
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