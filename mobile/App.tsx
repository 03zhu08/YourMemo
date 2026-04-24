import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

export default Root;
