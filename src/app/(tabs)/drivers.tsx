import { Pencil, Phone, Plus, RefreshCw, Search, Star, Trash2, TrendingUp, Truck as TruckIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
};

type DriverStats = {
  driver_id: string;
  total_routes: number;
  total_mileage_km: number;
  total_fuel_liters: number;
};

const PAGE_SIZE = 25;

const statusMap = {
  on_duty: { bg: '#f0fdf4', color: colors.success, label: 'On Duty' },
  off_duty: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Off Duty' },
  on_leave: { bg: '#fffbeb', color: colors.warning, label: 'On Leave' },
};
const statusOptions = ['on_duty', 'off_duty', 'on_leave'] as const;

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, DriverStats>>({});
  const [truckMap, setTruckMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [driverCode, setDriverCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [status, setStatus] = useState<typeof statusOptions[number]>('off_duty');
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  const [alertDriver, setAlertDriver] = useState<Driver | null>(null);
  const [alertType, setAlertType] = useState<'accident' | 'breakdown' | 'emergency' | null>(null);
  const [alertNote, setAlertNote] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState('');

  const fetchDrivers = useCallback(async (pageNum: number, append: boolean) => {
    setError('');
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from('drivers').select('*').order('full_name').range(from, to);
    if (error) {
      setError(error.message);
    } else {
      const rows = data as Driver[];
      setDrivers(prev => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.from('driver_stats').select('*');
    if (!error && data) {
      const map: Record<string, DriverStats> = {};
      (data as DriverStats[]).forEach(s => { map[s.driver_id] = s; });
      setStatsMap(map);
    }
  }, []);

  const fetchAssignedTrucks = useCallback(async () => {
    const { data, error } = await supabase.from('trucks').select('truck_code, driver_id').not('driver_id', 'is', null);
    if (!error && data) {
      const map: Record<string, string> = {};
      data.forEach((t: any) => { map[t.driver_id] = t.truck_code; });
      setTruckMap(map);
    }
  }, []);

  useEffect(() => {
    fetchDrivers(0, false);
    fetchStats();
    fetchAssignedTrucks();
  }, [fetchDrivers, fetchStats, fetchAssignedTrucks]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchDrivers(0, false);
    fetchStats();
    fetchAssignedTrucks();
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchDrivers(nextPage, true);
  };

  const resetForm = () => {
    setDriverCode(''); setFullName(''); setPhone('');
    setLicenseNumber(''); setLicenseExpiry(''); setStatus('off_duty');
    setEditingDriverId(null);
    setFormError('');
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (d: Driver) => {
    setDriverCode(d.driver_code);
    setFullName(d.full_name);
    setPhone(d.phone || '');
    setLicenseNumber(d.license_number);
    setLicenseExpiry(d.license_expiry);
    setStatus(d.status);
    setEditingDriverId(d.id);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveDriver = async () => {
    setFormError('');
    if (!driverCode || !fullName || !licenseNumber || !licenseExpiry) {
      setFormError('Driver code, name, license number, and expiry are required');
      return;
    }
    setSaving(true);
    const payload = {
      driver_code: driverCode,
      full_name: fullName,
      phone: phone || null,
      license_number: licenseNumber,
      license_expiry: licenseExpiry,
      status,
    };
    const { error } = editingDriverId
      ? await supabase.from('drivers').update(payload).eq('id', editingDriverId)
      : await supabase.from('drivers').insert(payload);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setFormOpen(false);
    resetForm();
    setPage(0);
    fetchDrivers(0, false);
  };

 const openAlert = (d: Driver, type: 'accident' | 'breakdown' | 'emergency') => {
    setAlertDriver(d);
    setAlertType(type);
    setAlertNote('');
    setAlertError('');
  };

  const submitAlert = async () => {
    if (!alertDriver || !alertType) return;
    setAlertSaving(true);
    setAlertError('');

    // Find this driver's current active route, if any
    const { data: activeRoute } = await supabase
      .from('routes')
      .select('id')
      .eq('driver_id', alertDriver.id)
      .in('status', ['planned', 'in_transit'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: truck } = await supabase
      .from('trucks')
      .select('id')
      .eq('driver_id', alertDriver.id)
      .maybeSingle();

    const { error } = await supabase.from('route_alerts').insert({
      route_id: activeRoute?.id || null,
      driver_id: alertDriver.id,
      truck_id: truck?.id || null,
      alert_type: alertType,
      message: alertNote || null,
    });

    setAlertSaving(false);
    if (error) {
      setAlertError(error.message);
      return;
    }
    setAlertDriver(null);
    setAlertType(null);
    setAlertNote('');
  };

  const handleDeleteDriver = (d: Driver) => {
    const doDelete = async () => {
      const { error } = await supabase.from('drivers').delete().eq('id', d.id);
      if (error) {
        setError(error.message.includes('violates foreign key')
          ? `Cannot delete ${d.full_name} — they have route history on record.`
          : error.message);
      } else {
        setPage(0);
        fetchDrivers(0, false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${d.full_name}? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Driver', `Remove ${d.full_name}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const filtered = drivers.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (truckMap[d.id] || '').toLowerCase().includes(search.toLowerCase())
  );

  const onDutyCount = drivers.filter(d => d.status === 'on_duty').length;

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
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.addBtnWide, { flex: 1 }]} onPress={openCreateForm}>
            <Plus size={16} color="#fff" />
            <Text style={styles.addBtnText}>New Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color={colors.primary} size="small" /> : <RefreshCw size={18} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No drivers found.</Text>
        ) : (
          filtered.map((d) => {
            const s = statusMap[d.status];
            const stats = statsMap[d.id];
            const assignedTruck = truckMap[d.id];
            return (
              <View key={d.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{initials(d.full_name)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{d.full_name}</Text>
                    <Text style={styles.code}>{d.driver_code}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Star size={12} color={colors.warning} />
                    <Text style={styles.detailText}>{Number(d.rating).toFixed(1)} rating</Text>
                  </View>
                  {d.phone && (
                    <View style={styles.detailRow}>
                      <Phone size={12} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>{d.phone}</Text>
                    </View>
                  )}
                  <Text style={styles.detailText}>License expires {d.license_expiry}</Text>
                  {assignedTruck && (
                    <View style={styles.detailRow}>
                      <TruckIcon size={12} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>Assigned: {assignedTruck}</Text>
                    </View>
                  )}
                </View>

                {stats && stats.total_routes > 0 && (
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
                    </View>
                  </View>
                )}

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(d)}>
                    <Pencil size={14} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteDriver(d)}>
                    <Trash2 size={14} color={colors.destructive} />
                    <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
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

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingDriverId ? 'Edit Driver' : 'New Driver'}</Text>
              <TouchableOpacity onPress={() => { setFormOpen(false); resetForm(); }}>
                <Text style={{ fontSize: 20, color: colors.mutedForeground }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.fieldLabel}>Driver Code</Text>
              <TextInput style={styles.input} value={driverCode} onChangeText={setDriverCode} placeholder="e.g. DRV-010" autoCapitalize="characters" />

              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="e.g. John Mwangi" />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="e.g. +255712345678" />

              <Text style={styles.fieldLabel}>License Number</Text>
              <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. TZ-LIC-12345" autoCapitalize="characters" />

              <Text style={styles.fieldLabel}>License Expiry</Text>
              <TextInput style={styles.input} value={licenseExpiry} onChangeText={setLicenseExpiry} placeholder="YYYY-MM-DD" />

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

              <Text style={styles.helperNote}>
                You can assign this driver to a truck afterward from the Fleet & Trucks screen.
              </Text>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveDriver} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{editingDriverId ? 'Save Changes' : 'Create Driver'}</Text>}
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
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
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', paddingVertical: 8, backgroundColor: colors.background, borderRadius: radius },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  loadMoreBtn: { backgroundColor: colors.card, borderRadius: radius, padding: 14, alignItems: 'center', marginTop: 4 },
  loadMoreText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
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