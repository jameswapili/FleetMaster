import { router } from 'expo-router';
import { LogOut, Mail, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme';

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || null);
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <User size={16} color={colors.mutedForeground} />
          <Text style={styles.label}>Signed in as</Text>
        </View>
        <View style={styles.row}>
          <Mail size={14} color={colors.foreground} />
          <Text style={styles.value}>{email || 'Unknown'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={16} color="#fff" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, marginBottom: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: colors.mutedForeground },
  value: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.destructive, borderRadius: radius, padding: 14 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});