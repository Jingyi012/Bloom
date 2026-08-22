import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { colors, typography } from '@/styles/tokens';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.background}
      iconColor={{ default: colors.inkSoft, selected: colors.coralDark }}
      labelStyle={{
        default: { color: colors.inkSoft, fontFamily: typography.uiSemiBold, fontSize: 10 },
        selected: { color: colors.coralDark, fontFamily: typography.uiSemiBold, fontSize: 10 },
      }}
      tintColor={colors.coralDark}
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="home" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="write">
        <Label>Write</Label>
        <Icon sf="pencil" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="pencil" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="circles">
        <Label>Circles</Label>
        <Icon sf="leaf.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="sprout" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf="person.fill" androidSrc={<VectorIcon family={MaterialCommunityIcons} name="account" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
