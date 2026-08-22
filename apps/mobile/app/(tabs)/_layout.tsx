import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
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
