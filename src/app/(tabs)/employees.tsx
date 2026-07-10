import { Mail, Phone, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string;
  hired_date: string;
  status: 'active' | 'on_leave' | 'inactive';
};

function StatusBadge({ status }: { status: Employee['status'] }) {
  const map = {
    active: { bg: '#f0fdf4', color: colors.success, label: 'Active' },
    on_leave: { bg: '#fffbeb', color: colors.warning, label: 'On Leave' },
    inactive: { bg: '#fef2f2', color: colors.destructive, label: 'Inactive' },
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

const PAGE_SIZE = 25;

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEmployees = useCallback(async (pageNum: number, append: boolean) => {
    setError('');
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true })
      .range(from, to);
    if (error) {
      setError(error.message);
    } else {
      const rows = data as Employee[];
      setEmployees(prev => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchEmployees(0, false); }, [fetchEmployees]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchEmployees(0, false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchEmployees(nextPage, true);
  };

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const onLeaveCount = employees.filter(e => e.status === 'on_leave').length;
  const inactiveCount = employees.filter(e => e.status === 'inactive').length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
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
          <Text style={styles.statLabel}>ON LEAVE</Text>
          <Text style={styles.statValue}>{onLeaveCount}</Text>
          <Text style={styles.statSub}>Approved leave</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>INACTIVE</Text>
          <Text style={styles.statValue}>{inactiveCount}</Text>
          <Text style={styles.statSub}>Needs review</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Plus size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No employees found.</Text>
      ) : (
        filtered.map((emp) => (
          <View key={emp.id} style={styles.empCard}>
            <View style={styles.empRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(emp.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.full_name}</Text>
                <Text style={styles.empCode}>{emp.employee_code}</Text>
              </View>
              <StatusBadge status={emp.status} />
            </View>
            <View style={styles.empDetails}>
              <Text style={styles.empRole}>{emp.role} · {emp.department}</Text>
              {emp.phone && (
                <View style={styles.detailRow}>
                  <Phone size={12} color={colors.mutedForeground} />
                  <Text style={styles.detailText}>{emp.phone}</Text>
                </View>
              )}
              {emp.email && (
                <View style={styles.detailRow}>
                  <Mail size={12} color={colors.mutedForeground} />
                  <Text style={styles.detailText}>{emp.email}</Text>
                </View>
              )}
              <Text style={styles.hiredText}>Hired {emp.hired_date}</Text>
            </View>
          </View>
        ))
      )}

      {hasMore && !search && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
          {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadMoreText}>Load More</Text>}
        </TouchableOpacity>
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
  empCard: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  empName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  empCode: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 4 },
  empRole: { fontSize: 12, color: colors.foreground, fontWeight: '600', marginBottom: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: colors.mutedForeground },
  hiredText: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  loadMoreBtn: { backgroundColor: colors.card, borderRadius: radius, padding: 14, alignItems: 'center', marginTop: 4 },
  loadMoreText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});