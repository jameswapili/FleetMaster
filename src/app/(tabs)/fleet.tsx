import { Gauge, Plus, RefreshCw, Search, TrendingUp, User, Wrench, X } from 'lucide-react-native';
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

type TruckStats = {
  truck_id: string;
  total_routes: number;
  total_mileage_km: number;
  total_fuel_liters: number;
  avg_km_per_liter: number;
};

type DriverOption = { id: string; full_name: string; driver_code: string };

const PAGE_SIZE = 25;

const statusMap = {
  active: { bg: '#f0fdf4', color: colors.success, label: 'Active' },
  idle: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Idle' },
  maintenance: { bg: '#fff7ed', color: colors.accent, label: 'Maintenance' },
  breakdown: { bg: '#fef2f2', color: colors.destructive, label: 'Breakdown' },
};
const statusOptions = ['active', 'idle', 'maintenance', 'breakdown'] as const;

export default function FleetScreen() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, TruckStats>>({});
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

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [truckCode, setTruckCode] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [status, setStatus] = useState<typeof statusOptions[number]>('idle');
  const [mileageKm, setMileageKm] = useState('');

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

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.from('truck_stats').select('*');
    if (!error && data) {
      const map: Record<string, TruckStats> = {};
      (data as TruckStats[]).forEach(s => { map[s.truck_id] = s; });
      setStatsMap(map);
    }
  }, []);

  useEffect(() => { fetchTrucks(0, false); fetchStats(); }, [fetchTrucks, fetchStats]);

  const onRefresh = () => { setRefreshing(true); setPage(0); fetchTrucks(0, false); fetchStats(); };
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

  const resetForm = () => {
    setTruckCode(''); setModel(''); setPlateNumber('');
    setStatus('idle'); setMileageKm('');
    setFormError('');
  };

  const handleCreateTruck = async () => {
    setFormError('');
    if (!truckCode || !model || !plateNumber) {
      setFormError('Truck code, Model, and Plate number are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('trucks').insert({
      truck_code: truckCode,
      model,
      plate_number: plateNumber,
      status,
      mileage_km: mileageKm ? Number(mileageKm) : 0,
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setFormOpen(false);
    resetForm();
    setPage(0);
    fetchTrucks(0, false);
    fetchStats();
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
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.addBtnWide, { flex: 1 }]} onPress={() => setFormOpen(true)}>
            <Plus size={16} color="#fff" />
            <Text style={styles.addBtnText}>New Truck</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color={colors.primary} size="small" /> : <RefreshCw size={18} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No trucks found.</Text>
        ) : (
          filtered.map((t) => {
            const s = statusMap[t.status];
            const stats = statsMap[t.id];
            return (
              <View key={t.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{t.truck_code} — {t.plate_number}</Text>
                    <Text style={styles.code}>{t.model}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Gauge size={12} color={colors.mutedForeground} />
                    <Text style={styles.detailText}>{t.mileage_km.toLocaleString()} km Mileage</Text>
                  </View>
                  {t.last_service_date && (
                    <View style={styles.detailRow}>
                      <Wrench size={12} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>Last service {t.last_service_date}</Text>
                    </View>
                  )}
                </View>

                {stats && (
                  <View style={styles.statsBlock}>
                    <View style={styles.statsBlockHeader}>
                      <TrendingUp size={12} color={colors.primary} />
                      <Text style={styles.statsBlockTitle}>Performance</Text>
                    </View>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{stats.total_routes}</Text>
                        <Text style={styles.statItemLabel}>Routes</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{Number(stats.total_mileage_km).toLocaleString()}</Text>
                        <Text style={styles.statItemLabel}>Route km</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{Number(stats.total_fuel_liters).toLocaleString()}</Text>
                        <Text style={styles.statItemLabel}>Liters used</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemValue}>{Number(stats.avg_km_per_liter).toFixed(2)}</Text>
                        <Text style={styles.statItemLabel}>Avg km/L</Text>
                      </View>
                    </View>
                  </View>
                )}

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

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Truck</Text>
              <TouchableOpacity onPress={() => { setFormOpen(false); resetForm(); }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.fieldLabel}>Truck Make</Text>
              <TextInput style={styles.input} value={truckCode} onChangeText={setTruckCode} placeholder="e.g. SCANIA" autoCapitalize="characters" />
              
              <Text style={styles.fieldLabel}>Model</Text>
              <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="e.g. R420" />


              <Text style={styles.fieldLabel}>Plate Number</Text>
              <TextInput style={styles.input} value={plateNumber} onChangeText={setPlateNumber} placeholder="e.g. T 300 DRH" autoCapitalize="characters" />
              

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.segmentRow}>
                {statusOptions.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.segment, status === opt && styles.segmentActive]}
                    onPress={() => setStatus(opt)}
                  >
                    <Text style={[styles.segmentText, status === opt && styles.segmentTextActive]}>{statusMap[opt].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Starting Mileage (km)</Text>
              <TextInput style={styles.input} value={mileageKm} onChangeText={setMileageKm} keyboardType="numeric" placeholder="e.g. 0" />

              <Text style={styles.helperNote}>
                You can assign a driver to this truck afterward from the Fleet list.
              </Text>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTruck} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Truck</Text>}
              </TouchableOpacity>
            </ScrollView>
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
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtnWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius, padding: 14 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  refreshBtn: { width: 48, height: 48, borderRadius: radius, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
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
  statsBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  statsBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statsBlockTitle: { fontSize: 12, fontWeight: '700', color: colors.primary },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statItemValue: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  statItemLabel: { fontSize: 9, color: colors.mutedForeground, marginTop: 2, textAlign: 'center' },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  assignText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  loadMoreBtn: { backgroundColor: colors.card, borderRadius: radius, padding: 14, alignItems: 'center', marginTop: 4 },
  loadMoreText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '70%' },
  formSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  modalSearch: { backgroundColor: colors.background, borderRadius: radius, padding: 12, marginBottom: 10, fontSize: 14 },
  driverOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverOptionName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  driverOptionCode: { fontSize: 12, color: colors.mutedForeground },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.background, borderRadius: radius, padding: 12, fontSize: 14, color: colors.foreground },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.background },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 12, color: colors.mutedForeground },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  helperNote: { fontSize: 11, color: colors.mutedForeground, marginTop: 16, fontStyle: 'italic' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});