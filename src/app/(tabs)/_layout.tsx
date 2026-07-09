import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import Header from '../../components/Header';

const screens: { name: string; title: string }[] = [
  { name: 'dashboard', title: 'Dashboard' },
  { name: 'settings', title: 'Settings' },
  { name: 'employees', title: 'Employees' },
  { name: 'drivers', title: 'Drivers' },
  { name: 'fleet', title: 'Fleet & Trucks' },
  { name: 'fuel', title: 'Fuel Management' },
  { name: 'routes', title: 'Routes' },
  { name: 'maintenance', title: 'Maintenance' },
  { name: 'payroll', title: 'Salaries & Payroll' },
  { name: 'reports', title: 'Reports' },
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