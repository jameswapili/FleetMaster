import { Edit2, Plus, Trash2, Wrench, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

type MaintenanceJob = {
  id: string;
  truck_code: string;
  maintenance_type: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  scheduled_date: string | null;
  completed_date: string | null;
  service_charge: number;
  total_cost: number;
  odometer_km: number | null;
  service_provider: string | null;
  created_at: string;
  requested_by: string | null;
};

type MaintenancePart = {
  id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  warranty_months: number | null;
};

const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#2563eb', label: 'In Progress' },
  completed: { bg: '#d1fae5', color: '#059669', label: 'Completed' },
};

const priorityMap: Record<string, { color: string; label: string }> = {
  low: { color: '#6b7280', label: 'Low' },
  medium: { color: '#f59e0b', label: 'Medium' },
  high: { color: '#ef4444', label: 'High' },
  critical: { color: '#7f1d1d', label: 'Critical' },
};

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

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export default function MaintenanceScreen() {
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<MaintenanceJob | null>(null);
  const [jobParts, setJobParts] = useState<MaintenancePart[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit states
  const [editMode, setEditMode] = useState(false);
  const [editingJob, setEditingJob] = useState<MaintenanceJob | null>(null);

  // Form states
  const [truckCode, setTruckCode] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('repair');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [scheduledDate, setScheduledDate] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');

  // Edit form states
  const [editTruckCode, setEditTruckCode] = useState('');
  const [editMaintenanceType, setEditMaintenanceType] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editServiceCharge, setEditServiceCharge] = useState('');
  const [editOdometerKm, setEditOdometerKm] = useState('');
  const [editServiceProvider, setEditServiceProvider] = useState('');

  // Parts form
  const [parts, setParts] = useState<Omit<MaintenancePart, 'id'>[]>([]);
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');

  const fetchJobs = useCallback(async () => {
    setError('');
    const { data, error } = await supabase
      .from('maintenance_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setJobs(data as MaintenanceJob[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const fetchJobParts = async (jobId: string) => {
    const { data, error } = await supabase
      .from('maintenance_parts')
      .select('*')
      .eq('maintenance_job_id', jobId);

    if (!error) {
      setJobParts(data as MaintenancePart[]);
    }
  };

  const openDetailModal = async (job: MaintenanceJob) => {
    setSelectedJob(job);
    await fetchJobParts(job.id);
    setDetailModalOpen(true);
  };

  const resetForm = () => {
    setTruckCode('');
    setMaintenanceType('repair');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('pending');
    setScheduledDate('');
    setServiceCharge('');
    setOdometerKm('');
    setServiceProvider('');
    setParts([]);
    setFormError('');
    setPartName('');
    setPartNumber('');
    setQuantity('');
    setUnitCost('');
    setSupplier('');
    setWarrantyMonths('');
  };

  const addPart = () => {
    if (!partName || !quantity || !unitCost) {
      setFormError('Part name, quantity, and unit cost are required');
      return;
    }

    const qty = Number(quantity);
    const cost = Number(unitCost);
    const totalCost = qty * cost;

    setParts([
      ...parts,
      {
        part_name: partName,
        part_number: partNumber || null,
        quantity: qty,
        unit_cost: cost,
        total_cost: totalCost,
        supplier: supplier || null,
        warranty_months: warrantyMonths ? Number(warrantyMonths) : null,
      },
    ]);

    setPartName('');
    setPartNumber('');
    setQuantity('');
    setUnitCost('');
    setSupplier('');
    setWarrantyMonths('');
    setFormError('');
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    const partsTotal = parts.reduce((sum, p) => sum + p.total_cost, 0);
    const service = Number(serviceCharge) || 0;
    return partsTotal + service;
  };

  const handleCreateJob = async () => {
    setFormError('');

    if (!truckCode || !title) {
      setFormError('Truck code and title are required');
      return;
    }

    setSaving(true);

    const totalCost = calculateTotalCost();

    const { data: jobData, error: jobError } = await supabase
      .from('maintenance_jobs')
      .insert({
        truck_code: truckCode,
        maintenance_type: maintenanceType,
        title: title,
        description: description || null,
        priority: priority,
        status: status,
        scheduled_date: scheduledDate || null,
        service_charge: Number(serviceCharge) || 0,
        total_cost: totalCost,
        odometer_km: odometerKm ? Number(odometerKm) : null,
        service_provider: serviceProvider || null,
      })
      .select()
      .single();

    if (jobError) {
      setFormError(jobError.message);
      setSaving(false);
      return;
    }

    if (parts.length > 0 && jobData) {
      const partsWithJobId = parts.map((p) => ({
        ...p,
        maintenance_job_id: jobData.id,
      }));

      const { error: partsError } = await supabase
        .from('maintenance_parts')
        .insert(partsWithJobId);

      if (partsError) {
        setFormError('Job created but failed to add parts: ' + partsError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    resetForm();
    fetchJobs();
  };

  const openEditModal = (job: MaintenanceJob) => {
    setEditingJob(job);
    setEditTruckCode(job.truck_code);
    setEditMaintenanceType(job.maintenance_type);
    setEditTitle(job.title);
    setEditDescription(job.description || '');
    setEditPriority(job.priority);
    setEditStatus(job.status);
    setEditScheduledDate(job.scheduled_date || '');
    setEditServiceCharge(job.service_charge?.toString() || '');
    setEditOdometerKm(job.odometer_km?.toString() || '');
    setEditServiceProvider(job.service_provider || '');
    setEditMode(true);
    setDetailModalOpen(false);
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;

    setFormError('');

    if (!editTruckCode || !editTitle) {
      setFormError('Truck code and title are required');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('maintenance_jobs')
      .update({
        truck_code: editTruckCode,
        maintenance_type: editMaintenanceType,
        title: editTitle,
        description: editDescription || null,
        priority: editPriority,
        status: editStatus,
        scheduled_date: editScheduledDate || null,
        service_charge: Number(editServiceCharge) || 0,
        odometer_km: editOdometerKm ? Number(editOdometerKm) : null,
        service_provider: editServiceProvider || null,
      })
      .eq('id', editingJob.id);

    setSaving(false);

    if (error) {
      setFormError('Failed to update: ' + error.message);
      return;
    }

    setEditMode(false);
    setEditingJob(null);
    fetchJobs();
    // Re-open detail modal with updated data
    const updatedJob = jobs.find(j => j.id === editingJob.id);
    if (updatedJob) {
      setSelectedJob(updatedJob);
      setDetailModalOpen(true);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Change status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const { error } = await supabase
              .from('maintenance_jobs')
              .update({ status: newStatus })
              .eq('id', jobId);

            if (!error) {
              fetchJobs();
              if (detailModalOpen) {
                setDetailModalOpen(false);
              }
            } else {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const deleteJob = async (jobId: string) => {
    Alert.alert(
      'Delete Maintenance Job',
      'Are you sure you want to delete this job? This will also delete all associated parts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('maintenance_jobs')
              .delete()
              .eq('id', jobId);

            if (!error) {
              fetchJobs();
              if (detailModalOpen) {
                setDetailModalOpen(false);
              }
            } else {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>New Maintenance Job</Text>
        </TouchableOpacity>

        {jobs.length === 0 ? (
          <Text style={styles.emptyText}>No maintenance jobs found.</Text>
        ) : (
          jobs.map((j) => {
            const s = statusMap[j.status] || statusMap.pending;
            const p = priorityMap[j.priority] || priorityMap.medium;
            return (
              <TouchableOpacity
                key={j.id}
                style={styles.card}
                onPress={() => openDetailModal(j)}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Wrench size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name}>{j.title}</Text>
                      <View style={[styles.badge, { backgroundColor: s.bg }]}>
                        <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.code}>
                      {j.truck_code} · {maintenanceTypes.find(t => t.value === j.maintenance_type)?.label || j.maintenance_type}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.priorityBadge, { color: p.color }]}>
                        ● {p.label} Priority
                      </Text>
                      {j.total_cost > 0 && (
                        <Text style={styles.costText}>TZS {formatCurrency(j.total_cost)}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* CREATE MAINTENANCE MODAL */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔧 New Maintenance Job</Text>
              <TouchableOpacity onPress={() => { setModalOpen(false); resetForm(); }}>
                <X size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.fieldLabel}>Truck Code *</Text>
              <TextInput
                style={styles.input}
                value={truckCode}
                onChangeText={setTruckCode}
                placeholder="e.g. TRK-001"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Engine oil change"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Maintenance Type</Text>
              <View style={styles.segmentRow}>
                {maintenanceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.segment, maintenanceType === type.value && styles.segmentActive]}
                    onPress={() => setMaintenanceType(type.value)}
                  >
                    <Text style={[styles.segmentText, maintenanceType === type.value && styles.segmentTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowTwoCols}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.segmentRowSmall}>
                    {priorities.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[styles.segmentSmall, priority === p.value && styles.segmentActive]}
                        onPress={() => setPriority(p.value)}
                      >
                        <Text style={[styles.segmentTextSmall, priority === p.value && styles.segmentTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.segmentRowSmall}>
                    {statusOptions.map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        style={[styles.segmentSmall, status === s.value && styles.segmentActive]}
                        onPress={() => setStatus(s.value)}
                      >
                        <Text style={[styles.segmentTextSmall, status === s.value && styles.segmentTextActive]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Scheduled Date</Text>
              <TextInput
                style={styles.input}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Service Provider</Text>
              <TextInput
                style={styles.input}
                value={serviceProvider}
                onChangeText={setServiceProvider}
                placeholder="e.g. Toyota Fleet Services"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Service Charge (Labor)</Text>
              <TextInput
                style={styles.input}
                value={serviceCharge}
                onChangeText={setServiceCharge}
                keyboardType="numeric"
                placeholder="e.g. 150000"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Odometer (KM)</Text>
              <TextInput
                style={styles.input}
                value={odometerKm}
                onChangeText={setOdometerKm}
                keyboardType="numeric"
                placeholder="e.g. 45230"
                placeholderTextColor={colors.mutedForeground}
              />

              {/* Parts Section */}
              <Text style={styles.sectionTitle}>🛠️ Spare Parts Used</Text>

              {parts.map((p, index) => (
                <View key={index} style={styles.partRow}>
                  <View style={styles.partInfo}>
                    <Text style={styles.partName}>{p.part_name}</Text>
                    <Text style={styles.partDetail}>
                      {p.quantity} × TZS {formatCurrency(p.unit_cost)} = TZS {formatCurrency(p.total_cost)}
                      {p.supplier && ` · ${p.supplier}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removePart(index)}>
                    <X size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addPartRow}>
                <View style={styles.addPartFields}>
                  <TextInput
                    style={[styles.inputSmall, { flex: 2 }]}
                    value={partName}
                    onChangeText={setPartName}
                    placeholder="Part name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TextInput
                    style={[styles.inputSmall, { flex: 1 }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="Qty"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TextInput
                    style={[styles.inputSmall, { flex: 1.5 }]}
                    value={unitCost}
                    onChangeText={setUnitCost}
                    keyboardType="numeric"
                    placeholder="Unit cost"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <TouchableOpacity style={styles.addPartBtn} onPress={addPart}>
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={supplier}
                onChangeText={setSupplier}
                placeholder="Supplier (optional)"
                placeholderTextColor={colors.mutedForeground}
              />

              {calculateTotalCost() > 0 && (
                <View style={styles.totalPreview}>
                  <Text style={styles.totalPreviewLabel}>Total Cost:</Text>
                  <Text style={styles.totalPreviewValue}>TZS {formatCurrency(calculateTotalCost())}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateJob} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Maintenance Job</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={detailModalOpen} animationType="slide" transparent onRequestClose={() => setDetailModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔧 Job Details</Text>
              <TouchableOpacity onPress={() => setDetailModalOpen(false)}>
                <X size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selectedJob.title}</Text>
                  <View style={[styles.badge, { backgroundColor: statusMap[selectedJob.status]?.bg || '#e5e7eb' }]}>
                    <Text style={[styles.badgeText, { color: statusMap[selectedJob.status]?.color || '#6b7280' }]}>
                      {statusMap[selectedJob.status]?.label || selectedJob.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailTruck}>🚛 {selectedJob.truck_code}</Text>
                <Text style={styles.detailType}>
                  {maintenanceTypes.find(t => t.value === selectedJob.maintenance_type)?.label || selectedJob.maintenance_type}
                  {' · '}
                  <Text style={{ color: priorityMap[selectedJob.priority]?.color || '#6b7280' }}>
                    {priorityMap[selectedJob.priority]?.label || selectedJob.priority} Priority
                  </Text>
                </Text>

                {selectedJob.description && (
                  <Text style={styles.detailDescription}>{selectedJob.description}</Text>
                )}

                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Scheduled</Text>
                    <Text style={styles.detailValue}>{selectedJob.scheduled_date || 'Not set'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Completed</Text>
                    <Text style={styles.detailValue}>{selectedJob.completed_date || 'Not yet'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Odometer</Text>
                    <Text style={styles.detailValue}>{selectedJob.odometer_km ? `${selectedJob.odometer_km} km` : 'N/A'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Service Provider</Text>
                    <Text style={styles.detailValue}>{selectedJob.service_provider || 'N/A'}</Text>
                  </View>
                </View>

                {/* Parts */}
                {jobParts.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>🛠️ Parts Used</Text>
                    {jobParts.map((p) => (
                      <View key={p.id} style={styles.partRow}>
                        <View style={styles.partInfo}>
                          <Text style={styles.partName}>{p.part_name}</Text>
                          <Text style={styles.partDetail}>
                            {p.quantity} × TZS {formatCurrency(p.unit_cost)} = TZS {formatCurrency(p.total_cost)}
                            {p.supplier && ` · ${p.supplier}`}
                            {p.warranty_months && ` · ${p.warranty_months} months warranty`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* Cost Summary */}
                <View style={styles.costSummary}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Parts Total</Text>
                    <Text style={styles.costValue}>
                      TZS {formatCurrency(jobParts.reduce((sum, p) => sum + p.total_cost, 0))}
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Service Charge</Text>
                    <Text style={styles.costValue}>TZS {formatCurrency(selectedJob.service_charge || 0)}</Text>
                  </View>
                  <View style={[styles.costRow, styles.costTotal]}>
                    <Text style={styles.costTotalLabel}>Total Cost</Text>
                    <Text style={styles.costTotalValue}>TZS {formatCurrency(selectedJob.total_cost || 0)}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(selectedJob)}
                  >
                    <Edit2 size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.statusBtn]}
                    onPress={() => {
                      const nextStatus = selectedJob.status === 'pending' ? 'in_progress' :
                                        selectedJob.status === 'in_progress' ? 'completed' :
                                        'pending';
                      updateJobStatus(selectedJob.id, nextStatus);
                    }}
                  >
                    <Edit2 size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Update Status</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => deleteJob(selectedJob.id)}
                  >
                    <Trash2 size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* EDIT MAINTENANCE MODAL */}
      <Modal visible={editMode} animationType="slide" transparent onRequestClose={() => setEditMode(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Maintenance Job</Text>
              <TouchableOpacity onPress={() => { setEditMode(false); setFormError(''); }}>
                <X size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.fieldLabel}>Truck Code *</Text>
              <TextInput
                style={styles.input}
                value={editTruckCode}
                onChangeText={setEditTruckCode}
                placeholder="e.g. TRK-001"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="e.g. Engine oil change"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Maintenance Type</Text>
              <View style={styles.segmentRow}>
                {maintenanceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.segment, editMaintenanceType === type.value && styles.segmentActive]}
                    onPress={() => setEditMaintenanceType(type.value)}
                  >
                    <Text style={[styles.segmentText, editMaintenanceType === type.value && styles.segmentTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowTwoCols}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.segmentRowSmall}>
                    {priorities.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[styles.segmentSmall, editPriority === p.value && styles.segmentActive]}
                        onPress={() => setEditPriority(p.value)}
                      >
                        <Text style={[styles.segmentTextSmall, editPriority === p.value && styles.segmentTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.segmentRowSmall}>
                    {statusOptions.map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        style={[styles.segmentSmall, editStatus === s.value && styles.segmentActive]}
                        onPress={() => setEditStatus(s.value)}
                      >
                        <Text style={[styles.segmentTextSmall, editStatus === s.value && styles.segmentTextActive]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Scheduled Date</Text>
              <TextInput
                style={styles.input}
                value={editScheduledDate}
                onChangeText={setEditScheduledDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Service Provider</Text>
              <TextInput
                style={styles.input}
                value={editServiceProvider}
                onChangeText={setEditServiceProvider}
                placeholder="e.g. Toyota Fleet Services"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Service Charge (Labor)</Text>
              <TextInput
                style={styles.input}
                value={editServiceCharge}
                onChangeText={setEditServiceCharge}
                keyboardType="numeric"
                placeholder="e.g. 150000"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.fieldLabel}>Odometer (KM)</Text>
              <TextInput
                style={styles.input}
                value={editOdometerKm}
                onChangeText={setEditOdometerKm}
                keyboardType="numeric"
                placeholder="e.g. 45230"
                placeholderTextColor={colors.mutedForeground}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateJob} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Update Job</Text>}
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
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius,
    padding: 14,
    marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground, flex: 1 },
  code: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  priorityBadge: { fontSize: 11, fontWeight: '600' },
  costText: { fontSize: 12, fontWeight: '600', color: colors.foreground },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: colors.card, borderRadius: radius, padding: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },

  // Form styles
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: colors.background, borderRadius: radius, padding: 12, fontSize: 14, color: colors.foreground },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inputSmall: { backgroundColor: colors.background, borderRadius: radius, padding: 10, fontSize: 13, color: colors.foreground },

  // Segment styles
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.background },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 11, color: colors.mutedForeground },
  segmentTextActive: { color: '#fff', fontWeight: '600' },

  rowTwoCols: { flexDirection: 'row', gap: 12, marginTop: 4 },
  col: { flex: 1 },
  segmentRowSmall: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  segmentSmall: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, backgroundColor: colors.background },
  segmentTextSmall: { fontSize: 10, color: colors.mutedForeground },
  segmentTextActiveSmall: { color: '#fff', fontWeight: '600' },

  // Parts styles
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginTop: 16, marginBottom: 8 },
  addPartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addPartFields: { flex: 1, flexDirection: 'row', gap: 6 },
  addPartBtn: { backgroundColor: colors.primary, borderRadius: radius, padding: 10, alignItems: 'center', justifyContent: 'center' },
  partRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: radius, padding: 10, marginBottom: 6 },
  partInfo: { flex: 1 },
  partName: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  partDetail: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },

  // Total preview
  totalPreview: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: colors.primary + '10', borderRadius: radius, marginTop: 12 },
  totalPreviewLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  totalPreviewValue: { fontSize: 14, fontWeight: '700', color: colors.primary },

  // Submit button
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Detail modal styles
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, flex: 1 },
  detailTruck: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  detailType: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  detailDescription: { fontSize: 14, color: colors.foreground, marginTop: 12, padding: 12, backgroundColor: colors.background, borderRadius: radius },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  detailItem: { flex: 1, minWidth: '45%', backgroundColor: colors.background, borderRadius: radius, padding: 10 },
  detailLabel: { fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 2 },

  // Cost summary
  costSummary: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  costLabel: { fontSize: 13, color: colors.mutedForeground },
  costValue: { fontSize: 13, color: colors.foreground },
  costTotal: { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  costTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  costTotalValue: { fontSize: 15, fontWeight: '700', color: colors.primary },

  // Action buttons
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: radius },
  editBtn: { backgroundColor: '#4f46e5' },
  statusBtn: { backgroundColor: colors.primary },
  deleteBtn: { backgroundColor: colors.destructive },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});