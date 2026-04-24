import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './i18n';
import ProjectListScreen from './screens/ProjectListScreen';
import TaskBoardScreen from './screens/TaskBoardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTintColor: '#6c5ce7',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="Projects" component={ProjectListScreen} options={{ title: 'YourMemo' }} />
        <Stack.Screen
          name="Tasks"
          component={TaskBoardScreen}
          options={({ route }: any) => ({ title: route.params?.projectName || 'Tasks' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
