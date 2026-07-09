import { DrawerContentScrollView } from 'expo-router/drawer';
import {
  BarChart3, ChevronRight,
  DollarSign,
  Fuel,
  LayoutDashboard,
  MapPin,
  Settings,
  Truck,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/theme';

const sections = [
  {
    label: null,
    items: [
      { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { name: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { name: 'employees', label: 'Employees', icon: Users },
      { name: 'drivers', label: 'Drivers', icon: UserCheck },
    ],
  },
  {
    label: 'FLEET',
    items: [
      { name: 'fleet', label: 'Fleet & Trucks', icon: Truck },
      { name: 'fuel', label: 'Fuel Management', icon: Fuel },
      { name: 'routes', label: 'Routes', icon: MapPin },
      { name: 'maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'payroll', label: 'Salaries & Payroll', icon: DollarSign },
      { name: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

export default function CustomDrawerContent(props:any) {
  const activeRoute = props.state.routeNames[props.state.index];

  return (
    <View style={styles.wrapper}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Truck size={18} color="#fff" />
        </View>
        <View>
          <Text style={styles.brandName}>INTERWORLD</Text>
          <Text style={styles.brandSub}>LOGISTICS CO LTD</Text>
        </View>
      </View>

      <DrawerContentScrollView {...props} style={{ backgroundColor: 'transparent' }}>
        {sections.map((section, si) => (
          <View key={si} style={{ marginBottom: 8 }}>
            {section.label && <Text style={styles.sectionLabel}>{section.label}</Text>}
            {section.items.map((item) => {
              const isActive = activeRoute === item.name;
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => props.navigation.navigate(item.name)}
                >
                  <Icon size={18} color={isActive ? colors.accent : '#cbd5e1'} />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>KA</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>Kwame Asante</Text>
          <Text style={styles.userRole}>Fleet Manager</Text>
        </View>
        <ChevronRight size={16} color="#cbd5e1" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.sidebar },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingTop: 50 },
  brandIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  brandSub: { color: '#94a3b8', fontSize: 10 },
  sectionLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginLeft: 20, marginTop: 12, marginBottom: 6 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 20, marginHorizontal: 8, borderRadius: 8 },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  navLabel: { color: '#cbd5e1', fontSize: 14 },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.07)' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  userName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  userRole: { color: '#94a3b8', fontSize: 11 },
});