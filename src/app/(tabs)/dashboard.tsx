import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { Truck, Users, MapPin, Fuel, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react-native';
import { colors, radius } from '../constants/theme';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 64;

const statCards = [
  { icon: Truck, label: 'ACTIVE FLEET', value: '47 / 84', sub: 'Deployed today', trend: '+3 trucks vs last month', up: true },
  { icon: Users, label: 'DRIVERS ON DUTY', value: '34 / 67', sub: 'Currently active', trend: '+5 drivers vs last month', up: true },
  { icon: MapPin, label: 'TRIPS TODAY', value: '31', sub: '6 delivered · 25 in transit', trend: '-2 trips vs last month', up: false },
  { icon: Fuel, label: 'FUEL COST (MTD)', value: 'TZS 83,240,000', sub: 'July 2024', trend: '+8.2% vs last month', up: true },
];

const fuelData = [
  { value: 6200, label: 'Jan' }, { value: 6800, label: 'Feb' }, { value: 7100, label: 'Mar' },
  { value: 7600, label: 'Apr' }, { value: 7300, label: 'May' }, { value: 7900, label: 'Jun' },
  { value: 7700, label: 'Jul' },
];

const tripsData = [
  { value: 480, label: 'Jan' }, { value: 420, label: 'Feb' }, { value: 460, label: 'Mar' },
  { value: 500, label: 'Apr' }, { value: 380, label: 'May' }, { value: 560, label: 'Jun' },
  { value: 540, label: 'Jul' },
].map(d => ({ ...d, frontColor: '#fca5a5' }));

const fleetStatus = [
  { value: 47, color: colors.chart3, text: 'Active', count: 47 },
  { value: 18, color: '#94a3b8', text: 'Idle', count: 18 },
  { value: 12, color: colors.chart2, text: 'Maintenance', count: 12 },
  { value: 7, color: colors.chart5, text: 'Breakdown', count: 7 },
];

const alerts = [
  { level: 'critical', text: 'TRK-071 has broken down on the DSM–Dodoma highway. Recovery team dispatched.' },
  { level: 'warning', text: 'Driver license expiring: Benjamin Mushi — Dec 2024. Renewal required.' },
  { level: 'warning', text: 'TRK-025 is overdue for scheduled engine oil change (198,700 km).' },
  { level: 'info', text: 'Fuel budget 78% utilized for July 2024. Monitor consumption.' },
];

const activity = [
  { text: 'TRK-031 departed DSM Port en route to Arusha Depot', time: '09:42' },
  { text: 'Fuel dispensed: 245 L to TRK-018 at PUMA Nyerere Rd — TZS 698,250', time: '09:15' },
  { text: 'TRK-018 completed delivery at Mwanza Terminal', time: '08:50' },
  { text: 'Maintenance job MNT-087 started on TRK-071 (Transmission)', time: '08:30' },
  { text: 'Driver Isaac Mensah clocked in — rating 4.9★', time: '07:55' },
];

function StatCard({ icon: Icon, label, value, sub, trend, up }: any) {
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
      <View style={styles.trendRow}>
        {up ? <TrendingUp size={12} color={colors.success} /> : <TrendingDown size={12} color={colors.destructive} />}
        <Text style={[styles.trendText, { color: up ? colors.success : colors.destructive }]}>{trend}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.pageTitle}>Dashboard</Text>

      <View style={styles.statsGrid}>
        {statCards.map((c, i) => <StatCard key={i} {...c} />)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fuel Consumption</Text>
        <Text style={styles.cardSubtitle}>Diesel & Petrol — Jan to Jul 2024 (litres)</Text>
        <LineChart
          data={fuelData}
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
        <Text style={styles.cardSubtitle}>84 vehicles total</Text>
        <View style={styles.donutRow}>
          <PieChart
            data={fleetStatus}
            donut
            radius={70}
            innerRadius={45}
          />
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
        <Text style={styles.cardSubtitle}>Completed vs failed — 2024</Text>
        <BarChart
          data={tripsData}
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
        {activity.map((a, i) => (
          <View key={i} style={styles.activityRow}>
            <Text style={styles.activityText}>{a.text}</Text>
            <Text style={styles.activityTime}>{a.time}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Alerts & Warnings</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>
        <Text style={styles.cardSubtitle}>{alerts.length} active</Text>
        {alerts.map((a, i) => {
          const bg = a.level === 'critical' ? '#fef2f2' : a.level === 'warning' ? '#fffbeb' : '#eff6ff';
          const iconColor = a.level === 'critical' ? colors.destructive : a.level === 'warning' ? colors.warning : colors.info;
          return (
            <View key={i} style={[styles.alertBox, { backgroundColor: bg }]}>
              {a.level === 'info' ? <Info size={16} color={iconColor} /> : <AlertTriangle size={16} color={iconColor} />}
              <Text style={styles.alertText}>{a.text}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  viewAll: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  alertBox: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 8, marginTop: 8 },
  alertText: { fontSize: 12, color: colors.foreground, flex: 1 },
});