import React, {useEffect} from 'react';
import {
  StyleSheet,
  View,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import {
  endCall,
  initializeSIP,
  makeCall,
  sipState,
} from './src/services/SipService';

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
          appName: 'Calling App',
        },
        android: {
          alertTitle: 'Permissions required',
          alertDescription:
            'This application needs to access your phone accounts',
          cancelButton: 'Cancel',
          okButton: 'OK',
          imageName: 'phone_account_icon',
          additionalPermissions: [
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          ],
          foregroundService: {
            channelId: 'com.callingapp',
            channelName: 'Foreground service for my app',
            notificationTitle: 'My app is running in the background',
            notificationIcon: 'ic_launcher.png',
          },
        },
      };

      try {
        // Setup CallKeep first
        await RNCallKeep.setup(options);
        console.log('RNCallKeep setup success');

        await requestPermissions();

        initializeSIP(
          'sip:7001@pbx.ibos.io',
          'wss#7001',
          'wss://pbx.ibos.io:8089/ws',
        );
        console.log('SIP service initialized');

        // Register CallKeep events
        RNCallKeep.addEventListener('didDisplayIncomingCall', data => {
          console.log('Incoming call displayed', data);
        });

        RNCallKeep.addEventListener('didReceiveStartCallAction', data => {
          console.log('Start call action received', data);
          makeCall(data?.handle);
        });

        RNCallKeep.addEventListener('endCall', data => {
          console.log('Call ended by system/user', data);
          sipState.session?.terminate();
        });
      } catch (error) {
        console.error('Setup failed', error);
      }
    };

    setupCallKeepAndSIP();

    return () => {
      RNCallKeep.removeEventListener('didDisplayIncomingCall');
      RNCallKeep.removeEventListener('didReceiveStartCallAction');
      RNCallKeep.removeEventListener('endCall');
    };
  }, []);

  const startCall = () => {
    makeCall('01822421743');
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
