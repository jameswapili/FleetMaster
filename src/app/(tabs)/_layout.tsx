import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import Header from '../../components/Header';

const screens: { name: string; title: string }[] = [
  { name: 'dashboard', title: 'FleetMaster' },
  { name: 'settings', title: 'FleetMaster' },
  { name: 'employees', title: 'FleetMaster' },
  { name: 'drivers', title: 'FleetMaster' },
  { name: 'fleet', title: 'FleetMaster' },
  { name: 'fuel', title: 'FleetMaster' },
  { name: 'routes', title: 'FleetMaster' },
  { name: 'maintenance', title: 'FleetMaster' },
  { name: 'payroll', title: 'FleetMaster' },
  { name: 'reports', title: 'FleetMaster' },
  { name: 'truck_stats', title: 'FleetMaster' },
];

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props:any) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerType: 'front',
        drawerStyle: { width: 260 },
        overlayColor: 'rgba(0,0,0,0.4)',
      }}
    >
      {screens.map((s) => (
        <Drawer.Screen
          key={s.name}
          name={s.name}
          options={{
            header: () => <Header title={s.title} />,
          }}
        />
      ))}
    </Drawer>
  );
}