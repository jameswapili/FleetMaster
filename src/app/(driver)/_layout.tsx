import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="maintenance-request"
        options={{
          title: 'Request Maintenance',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}