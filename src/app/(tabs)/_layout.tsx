import React from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NOW',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'EXPLORE',
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'LISTS',
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'PROFILE',
        }}
      />
    </Tabs>
  );
}
