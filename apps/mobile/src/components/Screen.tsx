import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { screenStyles } from '@/styles/components.styles';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = <View style={screenStyles.content}>{children}</View>;

  return (
    <SafeAreaView style={screenStyles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView contentInsetAdjustmentBehavior="automatic">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}
