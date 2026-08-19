// src/app/(driver)/dashboard.tsx
import { router } from 'expo-router';
import { Fuel, MapPin, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../constants/theme'; // ✅ FIXED PATH

type DriverData = {
  id: string;
  full_name: string;
  driver_code: string;
  truck: {
    id: string;
    truck_code: string;
    model: string;
  } | null;
};

type RouteData = {
  id: string;
  client_name: string;
  origin: string;
  destination: string;
  status: string;
};

export default function DriverDashboard() {
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [todayRoutes, setTodayRoutes] = useState<RouteData[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    setLoading(true);
    setError('');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError('Not logged in');
      setLoading(false);
      return;
    }

    // Fetch driver profile with truck info
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select(`
        id,
        full_name,
        driver_code,
        truck:trucks!inner(id, truck_code, model)
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (driverError) {
      setError(driverError.message);
      setLoading(false);
      return;
    }

    if (driverData) {
      // Handle truck data - if it's an array, take the first one
      const truckData = Array.isArray(driverData.truck) 
        ? driverData.truck[0] 
        : driverData.truck;
      
      setDriver({
        ...driverData,
        truck: truckData || null
      });

      // Fetch today's routes for this driver
      const today = new Date().toISOString().split('T')[0];
      const { data: routes, error: routeError } = await supabase
        .from('routes')
        .select('id, client_name, origin, destination, status')
        .eq('driver_id', driverData.id)
        .gte('created_at', today)
        .order('created_at', { ascending: true });

      if (!routeError) {
        setTodayRoutes(routes || []);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.header}>
        <Text style={styles.welcome}>👋 Welcome back,</Text>
        <Text style={styles.name}>{driver?.full_name || 'Driver'}</Text>
        <Text style={styles.code}>Code: {driver?.driver_code || 'N/A'}</Text>
      </View>

      {/* Assigned Truck */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚛 Your Assigned Truck</Text>
        {driver?.truck ? (
          <View style={styles.truckInfo}>
            <Text style={styles.truckCode}>{driver.truck.truck_code}</Text>
            <Text style={styles.truckModel}>{driver.truck.model}</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No truck assigned</Text>
        )}
      </View>

      {/* Today's Routes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Today's Routes</Text>
        {todayRoutes.length === 0 ? (
          <Text style={styles.emptyText}>No routes assigned today</Text>
        ) : (
          todayRoutes.map((route) => (
            <View key={route.id} style={styles.routeItem}>
              <MapPin size={16} color={colors.mutedForeground} />
              <Text style={styles.routeText}>{route.origin} → {route.destination}</Text>
              <Text style={styles.routeStatus}>{route.status}</Text>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
       
       <TouchableOpacity 
    style={styles.actionBtn}
  onPress={() => router.push('/(driver)/maintenance-request')}
>
  <Wrench size={24} color={colors.primary} />
  <Text style={styles.actionLabel}>Request</Text>
  <Text style={styles.actionSubLabel}>Maintenance</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => router.push('/(tabs)/fuel')}
        >
          <Fuel size={24} color={colors.primary} />
          <Text style={styles.actionLabel}>Log</Text>
          <Text style={styles.actionSubLabel}>Fuel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.destructive,
    textAlign: 'center',
  },
  header: {
    marginBottom: 20,
  },
  welcome: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  code: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 10,
  },
  truckInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  truckCode: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  truckModel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },
  routeStatus: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 8,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 16,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 6,
  },
  actionSubLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
});