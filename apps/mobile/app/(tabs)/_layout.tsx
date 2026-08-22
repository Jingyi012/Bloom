import { Tabs } from 'expo-router';
import { BloomTabBar } from '@/components/BloomTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BloomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="write" />
      <Tabs.Screen name="circles" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
