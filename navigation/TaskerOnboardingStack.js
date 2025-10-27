import React, { useContext, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import BasicInfoScreen from '../screens/taskerOnboarding/BasicInfoScreen';
import LocationScreen from '../screens/taskerOnboarding/LocationScreen';
import SkillsScreen from '../screens/taskerOnboarding/SkillsScreen';
import ProfileImageScreen from '../screens/taskerOnboarding/ProfileImageScreen';
import IdCardScreen from '../screens/taskerOnboarding/IdCardScreen';
import ReviewScreen from '../screens/taskerOnboarding/ReviewScreen';
import OnboardingHeader from '../component/tasker/OnboardingHeader';
import { AuthContext } from '../context/AuthContext';
import { navigate } from '../services/navigationService';

const Stack = createStackNavigator();

const TaskerOnboardingStack = () => {
  const { user, loading } = useContext(AuthContext);

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('AuthStack', { screen: 'Login' });
    }
  }, [user, loading]);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  // Show loading while redirecting or if no user
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 10 }}>Redirecting to login...</Text>
      </View>
    );
  }

  // Only render onboarding screens for authenticated users
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
        name="IdCard" 
        component={IdCardScreen}
        options={{ title: 'Identification Card' }}
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