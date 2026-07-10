import { Gauge, Plus, Search, User, Wrench, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type Truck = {
  id: string;
  truck_code: string;
  model: string;
  plate_number: string;
  status: 'active' | 'idle' | 'maintenance' | 'breakdown';
  mileage_km: number;
  last_service_date: string | null;
  driver_id: string | null;
  driver: { full_name: string } | null;
};

type DriverOption = { id: string; full_name: string; driver_code: string };

const PAGE_SIZE = 25;

const statusMap = {
  active: { bg: '#f0fdf4', color: colors.success, label: 'Active' },
  idle: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Idle' },
  maintenance: { bg: '#fff7ed', color: colors.accent, label: 'Maintenance' },
  breakdown: { bg: '#fef2f2', color: colors.destructive, label: 'Breakdown' },
};

export default function FleetScreen() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTruckId, setPickerTruckId] = useState<string | null>(null);
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);
  const [driverSearch, setDriverSearch] = useState('');

  const fetchTrucks = useCallback(async (pageNum: number, append: boolean) => {
    setError('');
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('trucks')
      .select('*, driver:drivers(full_name)')
      .order('truck_code')
      .range(from, to);
    if (error) {
      setError(error.message);
    } else {
      const rows = data as unknown as Truck[];
      setTrucks(prev => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchTrucks(0, false); }, [fetchTrucks]);

  const onRefresh = () => { setRefreshing(true); setPage(0); fetchTrucks(0, false); };
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchTrucks(nextPage, true);
  };

  const openDriverPicker = async (truckId: string) => {
    setPickerTruckId(truckId);
    setPickerOpen(true);
    const { data } = await supabase.from('drivers').select('id, full_name, driver_code').order('full_name');
    setDriverOptions((data as DriverOption[]) || []);
  };

  const assignDriver = async (driverId: string) => {
    if (!pickerTruckId) return;
    const { error } = await supabase.from('trucks').update({ driver_id: driverId }).eq('id', pickerTruckId);
    setPickerOpen(false);
    setPickerTruckId(null);
    if (error) {
      setError(error.message);
    } else {
      fetchTrucks(0, false);
      setPage(0);
    }
  };

  const filtered = trucks.filter(t =>
    t.truck_code.toLowerCase().includes(search.toLowerCase()) ||
    t.plate_number.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = trucks.filter(t => t.status === 'active').length;
  const filteredDrivers = driverOptions.filter(d =>
    d.full_name.toLowerCase().includes(driverSearch.toLowerCase())
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ACTIVE FLEET</Text>
            <Text style={styles.statValue}>{activeCount} / {trucks.length}</Text>
            <Text style={styles.statSub}>Deployed today</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput style={styles.searchInput} placeholder="Search trucks..." value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={styles.addBtn}>
            <Plus size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No trucks found.</Text>
        ) : (
          filtered.map((t) => {
            const s = statusMap[t.status];
            return (
              <View key={t.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{t.truck_code} — {t.model}</Text>
                    <Text style={styles.code}>{t.plate_number}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Gauge size={12} color={colors.mutedForeground} />
                    <Text style={styles.detailText}>{t.mileage_km.toLocaleString()} km</Text>
                  </View>
                  {t.last_service_date && (
                    <View style={styles.detailRow}>
                      <Wrench size={12} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>Last service {t.last_service_date}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.assignRow} onPress={() => openDriverPicker(t.id)}>
                  <User size={14} color={colors.primary} />
                  <Text style={styles.assignText}>
                    {t.driver?.full_name ? `Driver: ${t.driver.full_name}` : 'Assign a driver'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {hasMore && !search && (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>Load More</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Driver</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search drivers..."
              value={driverSearch}
              onChangeText={setDriverSearch}
            />
            <FlatList
              data={filteredDrivers}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.driverOption} onPress={() => assignDriver(item.id)}>
                  <Text style={styles.driverOptionName}>{item.full_name}</Text>
                  <Text style={styles.driverOptionCode}>{item.driver_code}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No drivers found.</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
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
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: colors.mutedForeground },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  assignText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  loadMoreBtn: { backgroundColor: colors.card, borderRadius: radius, padding: 14, alignItems: 'center', marginTop: 4 },
  loadMoreText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  modalSearch: { backgroundColor: colors.background, borderRadius: radius, padding: 12, marginBottom: 10, fontSize: 14 },
  driverOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverOptionName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  driverOptionCode: { fontSize: 12, color: colors.mutedForeground },
});