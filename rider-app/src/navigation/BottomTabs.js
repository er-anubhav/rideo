import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '@/features/ride/HomeScreen';
import UserProfileScreen from '@/features/profile/UserProfileScreen';
import RideHistoryScreen from '@/features/profile/RideHistoryScreen';

import ServicesScreen from '@/features/booking/ServicesScreen';

import InboxScreen from '@/features/support/InboxScreen';

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#FFFFFF', // white background like WelcomeScreen
                    borderTopColor: '#E5E7EB', // gray-200 border
                    borderTopWidth: 1,
                    height: 60,
                    paddingTop: 5,
                    paddingBottom: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 8,
                },
                tabBarActiveTintColor: '#9333EA', // purple-600 matching WelcomeScreen
                tabBarInactiveTintColor: '#6B7280', // gray-500
                tabBarLabelStyle: {
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 10,
                    marginBottom: 10,
                },
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
                }}
            />
            <Tab.Screen
                name="Services"
                component={ServicesScreen}
                options={{
                    tabBarLabel: 'Services',
                    tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
                }}
            />
            <Tab.Screen
                name="Activity"
                component={RideHistoryScreen}
                options={{
                    tabBarLabel: 'Activity',
                    tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={24} color={color} />,
                }}
            />
            <Tab.Screen
                name="Inbox"
                component={InboxScreen}
                options={{
                    tabBarLabel: 'Inbox',
                    tabBarIcon: ({ color }) => <Ionicons name="chatbubble-outline" size={24} color={color} />,
                }}
            />
            <Tab.Screen
                name="Account"
                component={UserProfileScreen}
                options={{
                    tabBarLabel: 'Account',
                    tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
};

export default BottomTabs;
