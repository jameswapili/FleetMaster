import { router } from 'expo-router';
import { AlertTriangle, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function MaintenanceRequestScreen() {
  const { profile } = useAuth();
  const [truckCode, setTruckCode] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchMyTruck = async () => {
      if (!profile?.driver_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('trucks')
        .select('truck_code')
        .eq('driver_id', profile.driver_id)
        .maybeSingle();
      setTruckCode(data?.truck_code || null);
      setLoading(false);
    };
    fetchMyTruck();
  }, [profile?.driver_id]);

  const handleSubmit = async () => {
    setError('');
    if (!title || !truckCode) {
      setError('Title is required, and you must have an assigned truck');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('maintenance_jobs').insert({
      truck_code: truckCode,
      maintenance_type: 'repair',
      title,
      description: description || null,
      priority,
      status: 'requested',
      requested_by: profile?.full_name || null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request Submitted</Text>
        <Text style={styles.subtitle}>
          Your maintenance request has been sent. The maintenance team will review it shortly.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!truckCode) {
    return (
      <View style={styles.container}>
        <AlertTriangle size={32} color={colors.warning} />
        <Text style={styles.title}>No Truck Assigned</Text>
        <Text style={styles.subtitle}>
          You don't have a truck assigned yet, so you can't submit a maintenance request. Contact your administrator.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Request Maintenance</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={styles.truckLabel}>Truck: {truckCode}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.fieldLabel}>Issue Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Brake pads worn out"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue in detail..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.segmentRow}>
          {priorities.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.segment, priority === p.value && styles.segmentActive]}
              onPress={() => setPriority(p.value)}
            >
              <Text style={[styles.segmentText, priority === p.value && styles.segmentTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Request</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  truckLabel: { fontSize: 13, color: colors.mutedForeground, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: colors.foreground, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 24 },
  error: { color: colors.destructive, marginBottom: 12, textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.card, borderRadius: radius, padding: 12, fontSize: 14, color: colors.foreground },
  textArea: { minHeight: 90 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 12, color: colors.mutedForeground },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: colors.primary, borderRadius: radius, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});