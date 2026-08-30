import { Check, Search, UserPlus, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type PendingUser = {
  id: string;
  full_name: string;
  department: string | null;
  driver_id: string | null;
  created_at: string;
};

type DriverOption = { id: string; full_name: string; driver_code: string };

const departments = [
  { value: 'admin', label: 'Admin' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'driver', label: 'Driver' },
];

export default function ApprovalsScreen() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [department, setDepartment] = useState('driver');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLabel, setDriverLabel] = useState('');
  const [newDriverLicenseExpiry, setNewDriverLicenseExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [newDriverMode, setNewDriverMode] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverLicense, setNewDriverLicense] = useState('');

  const fetchPending = useCallback(async () => {
    setError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, driver_id, created_at')
      .eq('is_approved', false)
      .order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setPending(data as PendingUser[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const onRefresh = () => { setRefreshing(true); fetchPending(); };

  const openReview = (user: PendingUser) => {
    setSelectedUser(user);
    setDepartment(user.department || 'driver');
    setDriverId(user.driver_id);
    setDriverLabel('');
  };

  const openDriverPicker = async () => {
    setDriverPickerOpen(true);
    setNewDriverMode(false);
    setDriverSearch('');
    const { data } = await supabase.from('drivers').select('id, full_name, driver_code').order('full_name');
    setDriverOptions((data as DriverOption[]) || []);
  };

  const selectExistingDriver = (opt: DriverOption) => {
    setDriverId(opt.id);
    setDriverLabel(`${opt.full_name} (${opt.driver_code})`);
    setDriverPickerOpen(false);
  };

 
  const createAndLinkDriver = async () => {
    if (!selectedUser) return;
    if (!newDriverLicense || !newDriverLicenseExpiry) {
      setError('License number and license expiry are required');
      return;
    }
    const generatedCode = `DRV-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        driver_code: generatedCode,
        full_name: selectedUser.full_name,
        phone: newDriverPhone || null,
        license_number: newDriverLicense,
        license_expiry: newDriverLicenseExpiry,
        status: 'off_duty',
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setDriverId(data.id);
    setDriverLabel(`${data.full_name} (${data.driver_code})`);
    setDriverPickerOpen(false);
    setNewDriverPhone('');
    setNewDriverLicense('');
    setNewDriverLicenseExpiry('');
  };

  const filteredDrivers = driverOptions.filter((d) =>
    d.full_name.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const handleApprove = async () => {
    if (!selectedUser) return;
    if (department === 'driver' && !driverId) {
      setError('Please link or create a driver record before approving');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        department,
        driver_id: department === 'driver' ? driverId : null,
        is_approved: true,
      })
      .eq('id', selectedUser.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSelectedUser(null);
    fetchPending();
  };

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
        <Text style={styles.pageTitle}>User Approvals</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {pending.length === 0 ? (
          <Text style={styles.emptyText}>No pending signups.</Text>
        ) : (
          pending.map((u) => (
            <TouchableOpacity key={u.id} style={styles.card} onPress={() => openReview(u)}>
              <Text style={styles.name}>{u.full_name}</Text>
              <Text style={styles.sub}>Signed up {new Date(u.created_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selectedUser} animationType="slide" transparent onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review User</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Text style={styles.reviewName}>{selectedUser?.full_name}</Text>

              <Text style={styles.fieldLabel}>Department</Text>
              <View style={styles.segmentRow}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.segment, department === d.value && styles.segmentActive]}
                    onPress={() => setDepartment(d.value)}
                  >
                    <Text style={[styles.segmentText, department === d.value && styles.segmentTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {department === 'driver' && (
                <>
                  <Text style={styles.fieldLabel}>Driver Record</Text>
                  <TouchableOpacity style={styles.pickerBtn} onPress={openDriverPicker}>
                    <Text style={driverLabel ? styles.pickerText : styles.pickerPlaceholder}>
                      {driverLabel || 'Link or create a driver record'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Check size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve User</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={driverPickerOpen} animationType="slide" transparent onRequestClose={() => setDriverPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{newDriverMode ? 'New Driver Record' : 'Link Driver Record'}</Text>
              <TouchableOpacity onPress={() => setDriverPickerOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {!newDriverMode ? (
              <>
                <View style={styles.searchBox}>
                  <Search size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search drivers..."
                    value={driverSearch}
                    onChangeText={setDriverSearch}
                  />
                </View>
                <TouchableOpacity style={styles.newDriverBtn} onPress={() => setNewDriverMode(true)}>
                  <UserPlus size={16} color={colors.primary} />
                  <Text style={styles.newDriverBtnText}>Create New Driver Record</Text>
                </TouchableOpacity>
                <FlatList
                  data={filteredDrivers}
                  keyExtractor={(d) => d.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.driverOption} onPress={() => selectExistingDriver(item)}>
                      <Text style={styles.driverOptionName}>{item.full_name}</Text>
                      <Text style={styles.driverOptionCode}>{item.driver_code}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>No drivers found.</Text>}
                />
              </>
            ) : (
              <ScrollView>
                <Text style={styles.fieldLabel}>Full Name (from signup)</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.pickerText}>{selectedUser?.full_name}</Text>
                </View>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput style={styles.input} value={newDriverPhone} onChangeText={setNewDriverPhone} placeholder="e.g. 0712345678" />
                <Text style={styles.fieldLabel}>License Number *</Text>
                <TextInput style={styles.input} value={newDriverLicense} onChangeText={setNewDriverLicense} placeholder="e.g. DL-123456" />
                <Text style={styles.fieldLabel}>License Expiry *</Text>
                <TextInput style={styles.input} value={newDriverLicenseExpiry} onChangeText={setNewDriverLicenseExpiry} placeholder="YYYY-MM-DD" />
                <TouchableOpacity style={styles.approveBtn} onPress={createAndLinkDriver}>
                  <Text style={styles.approveBtnText}>Create & Link</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  sub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: colors.card, borderRadius: radius, padding: 16, maxHeight: '85%' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  reviewName: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.background, borderRadius: radius, padding: 12, fontSize: 14, color: colors.foreground },
  readOnlyBox: { backgroundColor: colors.muted, borderRadius: radius, padding: 12 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.background },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 12, color: colors.mutedForeground },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  pickerBtn: { backgroundColor: colors.background, borderRadius: radius, padding: 12 },
  pickerText: { fontSize: 14, color: colors.foreground },
  pickerPlaceholder: { fontSize: 14, color: colors.mutedForeground },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: radius, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
  newDriverBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 8 },
  newDriverBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  driverOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverOptionName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  driverOptionCode: { fontSize: 12, color: colors.mutedForeground },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius, padding: 16, marginTop: 20, marginBottom: 20 },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});