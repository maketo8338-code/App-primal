import React from 'react';
import { Tabs } from 'expo-router';
import NeonTabBar from '../../src/navigation/NeonTabBar';

export default function TabsLayout() {
  return <Tabs tabBar={(props) => <NeonTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
    <Tabs.Screen name="index" />
    <Tabs.Screen name="foods" />
    <Tabs.Screen name="journal" />
    <Tabs.Screen name="profile" />
  </Tabs>;
}
