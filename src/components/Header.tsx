import { useNavigation } from 'expo-router';
import { Bell, Menu, Search } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/theme';

export default function Header({ title }: { title: string }) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <TouchableOpacity onPress={() => (navigation as any).openDrawer()}>
          <Menu size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn}>
          <Search size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Bell size={18} color={colors.mutedForeground} />
          <View style={styles.dot} />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>KA</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { position: 'relative' },
  dot: { position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.destructive },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});