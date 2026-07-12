import { Fuel as FuelIcon, Plus, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type FuelLog = {
  id: string;
  truck_code: string;
  plate_number: string;
  liters: number;
  price_per_liter: number;
  cost: number;
  station: string | null;
  logged_date: string;
  route_id: string | null;
  route: { client_name: string } | null;
};

type RouteOption = { id: string; label: string; truck_code: string | null };

const PAGE_SIZE = 25;

export default function FuelScreen() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totals, setTotals] = useState({ liters: 0, cost: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [station, setStation] = useState('');
  const [loggedDate, setLoggedDate] = useState(new Date().toISOString().slice(0, 10));

  const [routeId, setRouteId] = useState<string | null>(null);
  const [routeLabel, setRouteLabel] = useState('');
  const [truckCode, setTruckCode] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');

  const fetchLogs = useCallback(async (pageNum: number, append: boolean) => {
    setError('');
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*, route:routes(client_name)')
      .order('logged_date', { ascending: false })
      .range(from, to);
    if (error) {
      setError(error.message);
    } else {
      const rows = data as unknown as FuelLog[];
      setLogs(prev => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  const fetchTotals = useCallback(async () => {
    const { data, error } = await supabase.rpc('fuel_totals');
    if (!error && data && data.length > 0) {
      setTotals({ liters: Number(data[0].total_liters), cost: Number(data[0].total_cost) });
    }
  }, []);

  useEffect(() => {
    fetchLogs(0, false);
    fetchTotals();
  }, [fetchLogs, fetchTotals]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchLogs(0, false);
    fetchTotals();
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchLogs(nextPage, true);
  };

  const resetForm = () => {
    setLiters(''); setPricePerLiter(''); setStation('');
    setLoggedDate(new Date().toISOString().slice(0, 10));
    setRouteId(null); setRouteLabel(''); setTruckCode('');
    setFormError('');
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerSearch('');
    const { data } = await supabase
      .from('routes')
      .select('id, client_name, truck:trucks(truck_code)')
      .order('created_at', { ascending: false });
    setRouteOptions(
      (data || []).map((r: any) => ({
        id: r.id,
        label: r.client_name,
        truck_code: r.truck?.truck_code || null,
      }))
    );
  };

  const selectRoute = (opt: RouteOption) => {
    setRouteId(opt.id);
    setRouteLabel(opt.label);
    setTruckCode(opt.truck_code || '');
    setPickerOpen(false);
  };

  const handleLogFuel = async () => {
    setFormError('');
    if (!routeId || !truckCode || !liters || !pricePerLiter) {
      setFormError('Route, truck, liters, and price per liter are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('fuel_logs').insert({
      route_id: routeId,
      truck_code: truckCode,
      liters: Number(liters),
      price_per_liter: Number(pricePerLiter),
      station: station || null,
      logged_date: loggedDate,
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setFormOpen(false);
    resetForm();
    setPage(0);
    fetchLogs(0, false);
    fetchTotals();
  };

  const filteredRouteOptions = routeOptions.filter(o =>
    o.label.toLowerCase().includes(pickerSearch.toLowerCase())
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
            <Text style={styles.statLabel}>TOTAL LITERS</Text>
            <Text style={styles.statValue}>{totals.liters.toLocaleString()} L</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL COST</Text>
            <Text style={styles.statValue}>TZS {totals.cost.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logFuelBtn} onPress={() => setFormOpen(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.logFuelText}>Log Fuel Fill-up</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Fuel Logs</Text>

        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No fuel logs yet.</Text>
        ) : (
          logs.map((l) => (
            <View key={l.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconWrap}><FuelIcon size={16} color={colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{l.truck_code}- {l.plate_number}</Text>
                  <Text style={styles.code}>
                    {l.route?.client_name ? `${l.route.client_name} · ` : ''}{l.station || 'Unknown station'} · {l.logged_date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.liters}>{l.liters} L</Text>
                  <Text style={styles.cost}>TZS {Number(l.cost).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        {hasMore && (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>Load More</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Fuel Fill-up</Text>
              <TouchableOpacity onPress={() => { setFormOpen(false); resetForm(); }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.fieldLabel}>Route</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={openPicker}>
                <Text style={routeLabel ? styles.pickerText : styles.pickerPlaceholder}>{routeLabel || 'Select route'}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Truck (auto-filled)</Text>
              <View style={styles.readOnlyBox}>
                <Text style={truckCode ? styles.pickerText : styles.pickerPlaceholder}>{truckCode || 'Select a route first'}</Text>
              </View>

              <Text style={styles.fieldLabel}>Liters</Text>
              <TextInput style={styles.input} value={liters} onChangeText={setLiters} keyboardType="numeric" placeholder="e.g. 245" />

              <Text style={styles.fieldLabel}>Price per Liter (TZS)</Text>
              <TextInput style={styles.input} value={pricePerLiter} onChangeText={setPricePerLiter} keyboardType="numeric" placeholder="e.g. 2850" />

              {liters && pricePerLiter ? (
                <Text style={styles.calcPreview}>
                  Total cost: TZS {(Number(liters) * Number(pricePerLiter)).toLocaleString()}
                </Text>
              ) : null}

              <Text style={styles.fieldLabel}>Station</Text>
              <TextInput style={styles.input} value={station} onChangeText={setStation} placeholder="e.g. PUMA Nyerere Rd" />

              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput style={styles.input} value={loggedDate} onChangeText={setLoggedDate} placeholder="YYYY-MM-DD" />

              <Text style={styles.helperNote}>
                Cost is calculated automatically. This fill-up's total will also be added to the selected route's fuel totals.
              </Text>

              <TouchableOpacity style={styles.submitBtn} onPress={handleLogFuel} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log Fill-up</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Route</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.modalSearch} placeholder="Search..." value={pickerSearch} onChangeText={setPickerSearch} />
            <FlatList
              data={filteredRouteOptions}
              keyExtractor={(o) => o.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.driverOption} onPress={() => selectRoute(item)}>
                  <Text style={styles.driverOptionName}>{item.label}</Text>
                  {item.truck_code ? <Text style={styles.driverOptionCode}>{item.truck_code}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No routes found.</Text>}
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
  statValue: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginTop: 6 },
  logFuelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius, padding: 14, marginBottom: 16 },
  logFuelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  liters: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  cost: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
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
  pickerBtn: { backgroundColor: colors.background, borderRadius: radius, padding: 12 },
  pickerText: { fontSize: 14, color: colors.foreground },
  pickerPlaceholder: { fontSize: 14, color: colors.mutedForeground },
  readOnlyBox: { backgroundColor: colors.muted, borderRadius: radius, padding: 12 },
  calcPreview: { fontSize: 12, color: colors.success, fontWeight: '600', marginTop: 6 },
  helperNote: { fontSize: 11, color: colors.mutedForeground, marginTop: 16, fontStyle: 'italic' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});