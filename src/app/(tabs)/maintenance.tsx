import { Wrench } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type Job = {
  id: string;
  job_code: string;
  truck_code: string;
  job_type: string;
  status: 'pending' | 'in_progress' | 'completed';
  started_date: string | null;
  notes: string | null;
};

const statusMap = {
  pending: { bg: '#fffbeb', color: colors.warning, label: 'Pending' },
  in_progress: { bg: '#eff6ff', color: colors.info, label: 'In Progress' },
  completed: { bg: '#f0fdf4', color: colors.success, label: 'Completed' },
};

export default function MaintenanceScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = useCallback(async () => {
    setError('');
    const { data, error } = await supabase.from('maintenance_jobs').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setJobs(data as Job[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const onRefresh = () => { setRefreshing(true); fetchJobs(); };

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

      {jobs.length === 0 ? (
        <Text style={styles.emptyText}>No maintenance jobs found.</Text>
      ) : (
        jobs.map((j) => {
          const s = statusMap[j.status];
          return (
            <View key={j.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconWrap}><Wrench size={16} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{j.job_code} — {j.job_type}</Text>
                  <Text style={styles.code}>{j.truck_code}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              {(j.started_date || j.notes) && (
                <View style={styles.details}>
                  {j.started_date && <Text style={styles.detailText}>Started {j.started_date}</Text>}
                  {j.notes && <Text style={styles.detailText}>{j.notes}</Text>}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.destructive, marginBottom: 12, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 4 },
  detailText: { fontSize: 12, color: colors.mutedForeground },
});