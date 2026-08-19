import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type MaintenanceType = 'preventive' | 'repair' | 'emergency' | 'inspection' | 'spare_part_replacement';
type Priority = 'low' | 'medium' | 'high' | 'critical';

export default function MaintenanceRequestScreen() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('repair');
  const [priority, setPriority] = useState<Priority>('medium');
  const [odometerKm, setOdometerKm] = useState('');

  const maintenanceTypes = [
    { value: 'preventive', label: 'Preventive' },
    { value: 'repair', label: 'Repair' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'spare_part_replacement', label: 'Spare Part Replacement' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const handleSubmit = async () => {
    setError('');
    
    if (!title || !description) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError('Please login first');
      setSubmitting(false);
      return;
    }

    // Get driver info
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('id, truck_code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (driverError || !driverData) {
      setError('Driver profile not found');
      setSubmitting(false);
      return;
    }

    // Submit maintenance request
    const { error: insertError } = await supabase.from('maintenance_jobs').insert({
      truck_code: driverData.truck_code,
      maintenance_type: maintenanceType,
      title: title,
      description: description,
      priority: priority,
      status: 'requested',
      odometer_km: odometerKm ? Number(odometerKm) : null,
      requested_by: user.id,
      created_by: user.id,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    Alert.alert(
      '✅ Success',
      'Maintenance request submitted successfully!',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <ArrowLeft size={20} color={colors.mutedForeground} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>🔧 Request Maintenance</Text>
      <Text style={styles.subHeader}>Submit a maintenance request for your truck</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Maintenance Type */}
      <Text style={styles.fieldLabel}>Maintenance Type *</Text>
      <View style={styles.segmentRow}>
        {maintenanceTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[styles.segment, maintenanceType === type.value && styles.segmentActive]}
            onPress={() => setMaintenanceType(type.value as MaintenanceType)}
          >
            <Text style={[styles.segmentText, maintenanceType === type.value && styles.segmentTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Priority */}
      <Text style={styles.fieldLabel}>Priority *</Text>
      <View style={styles.segmentRow}>
        {priorities.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.segment, priority === p.value && styles.segmentActive]}
            onPress={() => setPriority(p.value as Priority)}
          >
            <Text style={[styles.segmentText, priority === p.value && styles.segmentTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title */}
      <Text style={styles.fieldLabel}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Engine oil change needed"
        placeholderTextColor={colors.mutedForeground}
      />

      {/* Description */}
      <Text style={styles.fieldLabel}>Description *</Text>
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

      {/* Odometer */}
      <Text style={styles.fieldLabel}>Odometer (KM)</Text>
      <TextInput
        style={styles.input}
        value={odometerKm}
        onChangeText={setOdometerKm}
        keyboardType="numeric"
        placeholder="e.g. 45230"
        placeholderTextColor={colors.mutedForeground}
      />

      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitBtn} 
        onPress={handleSubmit} 
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 20,
  },
  errorText: {
    color: colors.destructive,
    marginBottom: 12,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 12,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});