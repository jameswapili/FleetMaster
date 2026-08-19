import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'Driver Dashboard',
          headerShown: true,
        }} 
      />
      {/* 🆕 Add this */}
      <Stack.Screen 
        name="maintenance-request" 
        options={{ 
          title: 'Request Maintenance',
          presentation: 'modal', // Optional: makes it slide up from bottom
        }} 
      />
    </Stack>
  );
}