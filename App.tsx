import React, {useEffect} from 'react';
import {
  StyleSheet,
  View,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import {endCall, initializeSIP, makeCall} from './src/services/SipService';

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.error('Microphone permission denied.');
    }
  }
};

const App = () => {
  useEffect(() => {
    const setupCallKeepAndSIP = async () => {
      const options = {
        ios: {
          appName: 'My app name',
        },
        android: {
          alertTitle: 'Permissions required',
          alertDescription:
            'This application needs to access your phone accounts',
          cancelButton: 'Cancel',
          okButton: 'OK',
          imageName: 'phone_account_icon', // Add your icon in the drawable folder
          additionalPermissions: [
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE, // Add any other required permissions
          ],
          foregroundService: {
            channelId: 'com.imchr',
            channelName: 'Foreground service for my app',
            notificationTitle: 'My app is running in the background',
            notificationIcon: 'phone_account_icon',
          },
        },
      };

      try {
        // Setup CallKeep first
        await RNCallKeep.setup(options);
        console.log('RNCallKeep setup success');

        // Request necessary permissions
        await requestPermissions();

        // Initialize SIP service
        initializeSIP(
          'sip:7001@pbx.ibos.io',
          'wss#7001',
          'wss://pbx.ibos.io:8089/ws',
        );
        console.log('SIP service initialized');
      } catch (error) {
        console.error('Setup failed', error);
      }
    };

    setupCallKeepAndSIP();
  }, []);

  const startCall = () => {
    makeCall('120');
  };

  const stopCall = () => {
    endCall();
  };

  return (
    <View style={styles.container}>
      <Button title="Start Call" onPress={startCall} />
      <Button title="End Call" onPress={stopCall} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
