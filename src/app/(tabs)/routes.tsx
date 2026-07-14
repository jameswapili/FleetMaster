import { ArrowRight, MapPin, Package, Plus, RefreshCw, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type Route = {
  id: string;
  client_name: string;
  origin: string;
  destination: string;
  distance_km: number | null;
  status: 'planned' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  cargo_description: string | null;
  cargo_type: string | null;
  cargo_type_description: string | null;
  cargo_package: string | null;
  cargo_class: string | null;
  cargo_weight_kg: number | null;
  route_price: number;
  fuel_amount_liters: number;
  fuel_cost: number;
  driver_allowance: number;
  road_tolls_permits: number;
  road_tolls_permits_description: string | null;
  other_expenses: number;
  other_expenses_description: string | null;
  total_expenses: number;
  profit_loss: number;
  driver: { full_name: string } | null;
  truck: { truck_code: string } | null;
};

type Option = { id: string; label: string; sub?: string };

const statusMap = {
  planned: { bg: '#f1f5f9', color: colors.mutedForeground, label: 'Planned' },
  in_transit: { bg: '#eff6ff', color: colors.info, label: 'In Transit' },
  delivered: { bg: '#fff7ed', color: colors.accent, label: 'Delivered' },
  completed: { bg: '#f0fdf4', color: colors.success, label: 'Completed' },
  cancelled: { bg: '#fef2f2', color: colors.destructive, label: 'Cancelled' },
};

const cargoTypes = [
  { value: 'transit', label: 'Transit' },
  { value: 'local', label: 'Local' },
  { value: 'town_trip', label: 'Town Trip' },
];
const cargoPackages = [
  { value: 'loose', label: 'Loose Cargo' },
  { value: 'container_20ft', label: '20ft Container' },
  { value: 'container_40ft', label: '40ft Container' },
  { value: 'tanker', label: 'Tanker' },
];
const cargoClasses = [
  { value: 'normal', label: 'Normal' },
  { value: 'abnormal_wide_load', label: 'Abnormal / Wide Load' },
];

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [clientName, setClientName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [cargoType, setCargoType] = useState('transit');
  const [cargoTypeDescription, setCargoTypeDescription] = useState('');
  const [cargoPackage, setCargoPackage] = useState('loose');
  const [cargoClass, setCargoClass] = useState('normal');
  const [cargoWeight, setCargoWeight] = useState('');
  const [routePrice, setRoutePrice] = useState('');
  const [driverAllowance, setDriverAllowance] = useState('');
  const [roadTollsPermits, setRoadTollsPermits] = useState('');
  const [roadTollsDescription, setRoadTollsDescription] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');
  const [otherExpensesDescription, setOtherExpensesDescription] = useState('');

  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLabel, setDriverLabel] = useState('');
  const [truckId, setTruckId] = useState<string | null>(null);
  const [truckLabel, setTruckLabel] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerOptions, setPickerOptions] = useState<Option[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [truckLookupError, setTruckLookupError] = useState('');

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0.00';
  return Number(value).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

  const fetchRoutes = useCallback(async () => {
    setError('');
    const { data, error } = await supabase
      .from('routes')
      .select('*, driver:drivers(full_name), truck:trucks(truck_code)')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRoutes(data as unknown as Route[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
  const onRefresh = () => { setRefreshing(true); fetchRoutes(); };

  const resetForm = () => {
    setClientName(''); setOrigin(''); setDestination(''); setDistanceKm('');
    setCargoDescription('');
    setCargoType('transit'); setCargoTypeDescription('');
    setCargoPackage('loose');
    setCargoClass('normal'); setCargoWeight('');
    setRoutePrice(''); setDriverAllowance('');
    setRoadTollsPermits(''); setRoadTollsDescription('');
    setOtherExpenses(''); setOtherExpensesDescription('');
    setDriverId(null); setDriverLabel(''); setTruckId(null); setTruckLabel('');
    setTruckLookupError('');
    setFormError('');
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerSearch('');
    const { data } = await supabase.from('drivers').select('id, full_name, driver_code');
    setPickerOptions((data || []).map((d: any) => ({ id: d.id, label: d.full_name, sub: d.driver_code })));
  };

  const selectDriver = async (opt: Option) => {
    setDriverId(opt.id);
    setDriverLabel(opt.label);
    setPickerOpen(false);
    setTruckLookupError('');
    setTruckId(null);
    setTruckLabel('');

    // Pull the truck assigned to this driver automatically — no manual entry
    const { data, error } = await supabase
      .from('trucks')
      .select('id, truck_code, model')
      .eq('driver_id', opt.id)
      .maybeSingle();

    if (error) {
      setTruckLookupError('Could not look up assigned truck.');
    } else if (!data) {
      setTruckLookupError('This driver has no truck assigned yet. Assign one in Fleet & Trucks first.');
    } else {
      setTruckId(data.id);
      setTruckLabel(`${data.truck_code} — ${data.model}`);
    }
  };

  const handleCreateRoute = async () => {
    setFormError('');
    if (!clientName || !origin || !destination || !driverId || !truckId) {
      setFormError('Client name, origin, destination, driver, and truck are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('routes').insert({
      client_name: clientName,
      origin,
      destination,
      distance_km: distanceKm ? Number(distanceKm) : null,
      driver_id: driverId,
      truck_id: truckId,
      cargo_description: cargoDescription || null,
      cargo_type: cargoType,
      cargo_type_description: cargoTypeDescription || null,
      cargo_package: cargoPackage,
      cargo_class: cargoClass,
      cargo_weight_kg: cargoWeight ? Number(cargoWeight) : null,
      route_price: routePrice ? Number(routePrice) : 0,
      driver_allowance: driverAllowance ? Number(driverAllowance) : 0,
      road_tolls_permits: roadTollsPermits ? Number(roadTollsPermits) : 0,
      road_tolls_permits_description: roadTollsDescription || null,
      other_expenses: otherExpenses ? Number(otherExpenses) : 0,
      other_expenses_description: otherExpensesDescription || null,
      status: 'planned',
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setFormOpen(false);
    resetForm();
    fetchRoutes();
  };

  const filteredPickerOptions = pickerOptions.filter(o =>
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

      <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.newRouteBtn, { flex: 1 }]} onPress={() => setFormOpen(true)}>
            <Plus size={16} color="#fff" />
            <Text style={styles.newRouteText}>New Route</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color={colors.primary} size="small" /> : <RefreshCw size={18} color={colors.primary} />}
          </TouchableOpacity>
        
        </View>
        {routes.length === 0 ? (
          <Text style={styles.emptyText}>No routes found.</Text>
        ) : (
          routes.map((r) => {
            const s = statusMap[r.status];
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{r.client_name}</Text>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={styles.pathRow}>
                  <MapPin size={12} color={colors.mutedForeground} />
                  <Text style={styles.pathText}>{r.origin}</Text>
                  <ArrowRight size={12} color={colors.mutedForeground} />
                  <Text style={styles.pathText}>{r.destination}</Text>
                </View>
                <View style={styles.details}>
                  {r.distance_km != null && <Text style={styles.detailText}>{r.distance_km} km</Text>}
                  {r.driver?.full_name && <Text style={styles.detailText}>Driver: {r.driver.full_name}</Text>}
                  {r.truck?.truck_code && <Text style={styles.detailText}>Truck: {r.truck.truck_code}</Text>}
                </View>
                {r.cargo_description ? <Text style={styles.detailText}>{r.cargo_description}</Text> : null}
                {(r.cargo_type || r.cargo_package) && (
                  <View style={styles.cargoRow}>
                    <Package size={12} color={colors.mutedForeground} />
                    <Text style={styles.detailText}>
                      {cargoTypes.find(c => c.value === r.cargo_type)?.label || ''}
                      {r.cargo_package ? ` · ${cargoPackages.find(c => c.value === r.cargo_package)?.label}` : ''}
                      {r.cargo_weight_kg ? ` · ${r.cargo_weight_kg} kg` : ''}
                      {r.cargo_class === 'abnormal_wide_load' ? ' · Abnormal Load' : ''}
                    </Text>
                  </View>
                )}
                {r.cargo_type_description ? <Text style={styles.finNote}>{r.cargo_type_description}</Text> : null}
               <View style={styles.financials}>
  {/* Route Price - moved down to group with Total Expenses */}
  
  <View style={styles.finRow}>
    <Text style={styles.finLabel}>Fuel</Text>
    <Text style={styles.finValue}>{r.fuel_amount_liters}L · TZS {formatCurrency(r.fuel_cost)}</Text>
  </View>

  <View style={styles.finRow}>
    <Text style={styles.finLabel}>Driver Allowance</Text>
    <Text style={styles.finValue}>TZS {formatCurrency(r.driver_allowance)}</Text>
  </View>

  <View style={styles.finRow}>
    <Text style={styles.finLabel}>Road Tolls & Permits</Text>
    <Text style={styles.finValue}>TZS {formatCurrency(r.road_tolls_permits)}</Text>
  </View>
  {r.road_tolls_permits_description ? <Text style={styles.finNote}>{r.road_tolls_permits_description}</Text> : null}

  <View style={styles.finRow}>
    <Text style={styles.finLabel}>Other Expenses</Text>
    <Text style={styles.finValue}>TZS {formatCurrency(r.other_expenses)}</Text>
  </View>
  {r.other_expenses_description ? <Text style={styles.finNote}>{r.other_expenses_description}</Text> : null}

  {/* Grouped: Route Price & Total Expenses together */}
  <View style={[styles.finRow, styles.finRowTotalExpenses]}>
  <Text style={[styles.finLabelSubtotal, { color: colors.foreground }]}>Route Price</Text>
  <Text style={[styles.finValueSubtotal, { color: colors.foreground }]}>TZS {formatCurrency(r.route_price)}</Text>
</View>

  <View style={[styles.finRow, styles.finRowTotalExpenses]}>
    <Text style={[styles.finLabelSubtotal, { color: colors.destructive }]}>Total Expenses</Text>
    <Text style={styles.finValueSubtotal}>TZS {formatCurrency(r.total_expenses)}</Text>
  </View>

  {/* Profit / Loss */}
<View style={[styles.finRow, styles.finRowTotal]}>
  <Text style={[styles.finLabelTotal, { color: Number(r.profit_loss) >= 0 ? colors.success : colors.destructive }]}>
    {Number(r.profit_loss) >= 0 ? 'PROFIT' : 'LOSS'}
  </Text>
  <Text style={[styles.finValueTotal, { color: Number(r.profit_loss) >= 0 ? colors.success : colors.destructive }]}>
    TZS {formatCurrency(r.profit_loss)}
  </Text>
</View>
</View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Route</Text>
              <TouchableOpacity onPress={() => { setFormOpen(false); resetForm(); }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.fieldLabel}>Client Name</Text>
              <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="e.g. Interworld Logistics" />

              <Text style={styles.fieldLabel}>Origin</Text>
              <TextInput style={styles.input} value={origin} onChangeText={setOrigin} placeholder="e.g. Dar es Salaam Port" />

              <Text style={styles.fieldLabel}>Destination</Text>
              <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="e.g. Mwanza Terminal" />

              <Text style={styles.fieldLabel}>Distance (km)</Text>
              <TextInput style={styles.input} value={distanceKm} onChangeText={setDistanceKm} keyboardType="numeric" placeholder="e.g. 620" />

              <Text style={styles.fieldLabel}>Driver</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={openPicker}>
                <Text style={driverLabel ? styles.pickerText : styles.pickerPlaceholder}>{driverLabel || 'Select driver'}</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Truck (auto-assigned)</Text>
              <View style={styles.readOnlyBox}>
                <Text style={truckLabel ? styles.pickerText : styles.pickerPlaceholder}>
                  {truckLabel || 'Select a driver to auto-fill their truck'}
                </Text>
              </View>
              {truckLookupError ? <Text style={styles.warningText}>{truckLookupError}</Text> : null}

              <Text style={styles.fieldLabel}>Cargo Description</Text>
              <TextInput style={styles.input} value={cargoDescription} onChangeText={setCargoDescription} placeholder="Brief description of the cargo" />

              <Text style={styles.fieldLabel}>Cargo Type</Text>
              <View style={styles.segmentRow}>
                {cargoTypes.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.segment, cargoType === c.value && styles.segmentActive]}
                    onPress={() => setCargoType(c.value)}
                  >
                    <Text style={[styles.segmentText, cargoType === c.value && styles.segmentTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.input, { marginTop: 8 }]} value={cargoTypeDescription} onChangeText={setCargoTypeDescription} placeholder="Cargo type description" />

              <Text style={styles.fieldLabel}>Cargo Package</Text>
              <View style={styles.segmentRow}>
                {cargoPackages.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.segment, cargoPackage === c.value && styles.segmentActive]}
                    onPress={() => setCargoPackage(c.value)}
                  >
                    <Text style={[styles.segmentText, cargoPackage === c.value && styles.segmentTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Cargo Class</Text>
              <View style={styles.segmentRow}>
                {cargoClasses.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.segment, cargoClass === c.value && styles.segmentActive]}
                    onPress={() => setCargoClass(c.value)}
                  >
                    <Text style={[styles.segmentText, cargoClass === c.value && styles.segmentTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Cargo Weight (kg)</Text>
              <TextInput style={styles.input} value={cargoWeight} onChangeText={setCargoWeight} keyboardType="numeric" placeholder="e.g. 12000" />

              <Text style={styles.fieldLabel}>Route Price (TZS)</Text>
              <TextInput style={styles.input} value={routePrice} onChangeText={setRoutePrice} keyboardType="numeric" placeholder="Amount charged to client" />

              <Text style={styles.fieldLabel}>Driver Allowance (TZS)</Text>
              <TextInput style={styles.input} value={driverAllowance} onChangeText={setDriverAllowance} keyboardType="numeric" placeholder="Route allowance" />

              <Text style={styles.fieldLabel}>Road Tolls & Permits (TZS)</Text>
              <TextInput style={styles.input} value={roadTollsPermits} onChangeText={setRoadTollsPermits} keyboardType="numeric" placeholder="Toll and permit fees" />
              <TextInput style={[styles.input, { marginTop: 8 }]} value={roadTollsDescription} onChangeText={setRoadTollsDescription} placeholder="Description (e.g. which tolls/permits)" />

              <Text style={styles.fieldLabel}>Other Expenses (TZS)</Text>
              <TextInput style={styles.input} value={otherExpenses} onChangeText={setOtherExpenses} keyboardType="numeric" placeholder="Any other cost" />
              <TextInput style={[styles.input, { marginTop: 8 }]} value={otherExpensesDescription} onChangeText={setOtherExpensesDescription} placeholder="Description of other expenses" />

              <Text style={styles.helperNote}>
                Fuel amount and cost will populate automatically once fuel is logged against this route in Fuel Management.
              </Text>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateRoute} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Route</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Driver</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.modalSearch} placeholder="Search..." value={pickerSearch} onChangeText={setPickerSearch} />
            <FlatList
              data={filteredPickerOptions}
              keyExtractor={(o) => o.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.driverOption} onPress={() => selectDriver(item)}>
                  <Text style={styles.driverOptionName}>{item.label}</Text>
                  {item.sub ? <Text style={styles.driverOptionCode}>{item.sub}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No results.</Text>}
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
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  newRouteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius, padding: 14, marginBottom: 16 },
  newRouteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  refreshBtn: { width: 48, height: 48, borderRadius: radius, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  card: { 
  backgroundColor: colors.card, 
  borderRadius: radius, 
  padding: 14, 
  marginBottom: 10, 
  borderBottomWidth: 3,           // <-- BOLD LINE THICKNESS
  borderBottomColor: colors.foreground  // <-- USE YOUR THEME COLOR
},
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  pathText: { fontSize: 12, color: colors.foreground },
  details: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailText: { fontSize: 12, color: colors.mutedForeground },
  cargoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  financials: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 4 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between' },
  finLabel: { fontSize: 11, color: colors.mutedForeground },
  finValue: { fontSize: 11, color: colors.foreground, fontWeight: '600' },
  finNote: { fontSize: 10, color: colors.mutedForeground, fontStyle: 'italic', marginBottom: 2 },
  finRowTotalExpenses: { marginTop: 2, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  finLabelSubtotal: { fontSize: 12, color: colors.foreground, fontWeight: '700', textTransform: 'uppercase' },
  finValueSubtotal: { fontSize: 12, color: colors.destructive, fontWeight: '700' },
  finRowTotal: { marginTop: 4, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  finLabelTotal: { fontSize: 12, color: colors.foreground, fontWeight: '700', textTransform: 'uppercase' },
  finValueTotal: { fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '70%' },
  formSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '90%' },
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
  warningText: { fontSize: 11, color: colors.warning, marginTop: 6 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.background },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 12, color: colors.mutedForeground },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  helperNote: { fontSize: 11, color: colors.mutedForeground, marginTop: 16, fontStyle: 'italic' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
 