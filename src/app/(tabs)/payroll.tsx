import { DollarSign } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type PayrollRow = {
  id: string;
  pay_month: string;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: 'paid' | 'pending';
  employees: { full_name: string } | null;
};

export default function PayrollScreen() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPayroll = useCallback(async () => {
    setError('');
    const { data, error } = await supabase
      .from('payroll')
      .select('*, employees(full_name)')
      .order('pay_month', { ascending: false });
    if (error) setError(error.message);
    else setRows(data as unknown as PayrollRow[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const onRefresh = () => { setRefreshing(true); fetchPayroll(); };

  const totalNet = rows.reduce((sum, r) => sum + Number(r.net_salary), 0);

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

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>TOTAL NET PAYROLL</Text>
        <Text style={styles.statValue}>TZS {totalNet.toLocaleString()}</Text>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No payroll records yet. Run payroll from Supabase or add an entry form later.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}><DollarSign size={16} color={colors.success} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.employees?.full_name || 'Unknown'}</Text>
                <Text style={styles.code}>{r.pay_month}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.net}>TZS {Number(r.net_salary).toLocaleString()}</Text>
                <Text style={[styles.status, { color: r.status === 'paid' ? colors.success : colors.warning }]}>
                  {r.status === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
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
  statCard: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 16 },
  statLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.foreground, marginTop: 6 },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20, paddingHorizontal: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  net: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  status: { fontSize: 11, fontWeight: '600', marginTop: 1 },
});