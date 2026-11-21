import React, { forwardRef, useId } from 'react';
import { FlatList, FlatListProps, NativeScrollEvent, NativeSyntheticEvent, ScrollView, ScrollViewProps } from 'react-native';
import { useNeonOptional } from '../neon/NeonProvider';

function useScrollFeed(onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void) {
  const neon = useNeonOptional(); const key = useId();
  return (event: NativeSyntheticEvent<NativeScrollEvent>) => { neon?.scrollTo(key, event.nativeEvent.contentOffset.y); onScroll?.(event); };
}

/** ScrollView that drags the neon dust along with the content. */
export const NeonScrollView = forwardRef<ScrollView, ScrollViewProps>(function NeonScrollView(props, ref) {
  const onScroll = useScrollFeed(props.onScroll);
  return <ScrollView ref={ref} scrollEventThrottle={16} {...props} onScroll={onScroll} />;
});

/** FlatList that drags the neon dust along with the content. */
export function NeonFlatList<T>(props: FlatListProps<T>) {
  const onScroll = useScrollFeed(props.onScroll);
  return <FlatList scrollEventThrottle={16} {...props} onScroll={onScroll} />;
}
