// [FileName: screens/BasicScreen.js]

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ClientOnboarding = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic Screen Template</Text>
      <Text>Start building your UI here!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Centers content vertically
    alignItems: 'center',     // Centers content horizontally
    backgroundColor: '#fff',  // White background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default ClientOnboarding;