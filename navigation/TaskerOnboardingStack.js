import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BasicInfoScreen from '../screens/taskerOnboarding/BasicInfoScreen';
import LocationScreen from '../screens/taskerOnboarding/LocationScreen';
import SkillsScreen from '../screens/taskerOnboarding/SkillsScreen';
import ProfileImageScreen from '../screens/taskerOnboarding/ProfileImageScreen';
import ReviewScreen from '../screens/taskerOnboarding/ReviewScreen';
import OnboardingHeader from '../component/tasker/OnboardingHeader';

const Stack = createStackNavigator();

const TaskerOnboardingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: (props) => <OnboardingHeader {...props} />,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="BasicInfo" 
        component={BasicInfoScreen}
        options={{ title: 'Basic Info' }}
      />
      <Stack.Screen 
        name="Location" 
        component={LocationScreen}
        options={{ title: 'Location' }}
      />
      <Stack.Screen 
        name="Skills" 
        component={SkillsScreen}
        options={{ title: 'Skills' }}
      />
      <Stack.Screen 
        name="ProfileImage" 
        component={ProfileImageScreen}
        options={{ title: 'Profile Photo' }}
      />
      <Stack.Screen 
        name="Review" 
        component={ReviewScreen}
        options={{ title: 'Review', headerLeft: null, contentStyle: { flex: 1 } }}
      />
    </Stack.Navigator>
  );
};

export default TaskerOnboardingStack;