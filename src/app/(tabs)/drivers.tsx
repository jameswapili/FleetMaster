import { Phone, Plus, Search, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type Driver = {
  id: string;
  driver_code: string;
  full_name: string;
  phone: string | null;
  license_number: string;
  license_expiry: string;
  rating: number;
  status: 'on_duty' | 'off_duty' | 'on_leave';
  assigned_truck: string | null;
};

function StatusBadge({ status }: { status: Driver['status'] }) {
  const map = {
    on_duty: { bg: '#f0fdf4', color: colors.success, label: 'On Duty' },
    off_duty: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Off Duty' },
    on_leave: { bg: '#fffbeb', color: colors.warning, label: 'On Leave' },
  };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchDrivers = useCallback(async () => {
    setError('');
    const { data, error } = await supabase.from('drivers').select('*').order('full_name');
    if (error) setError(error.message);
    else setDrivers(data as Driver[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const onRefresh = () => { setRefreshing(true); fetchDrivers(); };

  const filtered = drivers.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.assigned_truck || '').toLowerCase().includes(search.toLowerCase())
  );

  const onDutyCount = drivers.filter(d => d.status === 'on_duty').length;

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
          <Text style={styles.statLabel}>ON DUTY</Text>
          <Text style={styles.statValue}>{onDutyCount} / {drivers.length}</Text>
          <Text style={styles.statSub}>Currently active</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput style={styles.searchInput} placeholder="Search drivers..." value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Plus size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No drivers found.</Text>
      ) : (
        filtered.map((d) => (
          <View key={d.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(d.full_name)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.full_name}</Text>
                <Text style={styles.code}>{d.driver_code}</Text>
              </View>
              <StatusBadge status={d.status} />
            </View>
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Star size={12} color={colors.warning} />
                <Text style={styles.detailText}>{d.rating.toFixed(1)} rating</Text>
              </View>
              {d.phone && (
                <View style={styles.detailRow}>
                  <Phone size={12} color={colors.mutedForeground} />
                  <Text style={styles.detailText}>{d.phone}</Text>
                </View>
              )}
              <Text style={styles.detailText}>License expires {d.license_expiry}</Text>
              {d.assigned_truck && <Text style={styles.detailText}>Assigned: {d.assigned_truck}</Text>}
            </View>
          </View>
        ))
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
  statValue: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginTop: 6 },
  statSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
  addBtn: { width: 44, height: 44, borderRadius: radius, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: colors.mutedForeground },
});