import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { tabBarStyles as styles } from '@/styles/tabbar.styles';
import { useSettings } from '@/settings/SettingsProvider';

const tabs = {
  index: { icon: 'home-variant-outline', activeIcon: 'home-variant', key: 'home' as const },
  write: { icon: 'pencil-outline', activeIcon: 'pencil', key: 'write' as const },
  circles: { icon: 'sprout-outline', activeIcon: 'sprout', key: 'circles' as const },
  profile: { icon: 'account-outline', activeIcon: 'account', key: 'profile' as const },
} as const;

export function BloomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  return <View style={[styles.bar, { bottom: Math.max(insets.bottom, 8) }]}>
    {state.routes.map((route, index) => {
      const config = tabs[route.name as keyof typeof tabs];
      if (!config) return null;
      const focused = state.index === index;
      const label = t(config.key);
      const onPress = () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      };
      return <Pressable accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel ?? label} accessibilityRole="tab" accessibilityState={focused ? { selected: true } : {}} key={route.key} onPress={onPress} style={[styles.item, focused ? styles.itemActive : null]}>
        <MaterialCommunityIcons color={focused ? '#E8536A' : '#7A6B72'} name={focused ? config.activeIcon : config.icon} size={21} />
        <Text style={[styles.label, focused ? styles.labelActive : null]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
