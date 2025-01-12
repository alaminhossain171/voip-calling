import RNCallKeep from 'react-native-callkeep';
import {Platform, PermissionsAndroid} from 'react-native';
import {endCall, makeCall} from './SipService';

export const initializeCallKeep = async () => {
  const options = {
    ios: {
      appName: 'My App',
    },
    android: {
      alertTitle: 'Permissions required',
      alertDescription: 'This app needs permission to access phone calls.',
      cancelButton: 'Cancel',
      okButton: 'OK',
      additionalPermissions: [
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ],
      foregroundService: {
        channelId: 'com.myapp',
        channelName: 'Call Service',
        notificationTitle: 'CallKeep is running',
      },
    },
  };

  await RNCallKeep.setup(options);
  await requestPermissions();
};

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);
    const denied = Object.values(granted).filter(value => value !== 'granted');
    if (denied.length > 0) {
      console.error('Required permissions denied:', denied);
    }
  }
};

export const handleIncomingCall = () => {
  RNCallKeep.addEventListener('answerCall', ({callUUID}) => {
    console.log('Incoming call answered:', callUUID);
    // Answer the SIP call
    makeCall(callUUID);
  });

  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
    console.log('Call ended:', callUUID);
    // Terminate the SIP call
    endCall();
  });
};

export const handleOutgoingCall = (number: string) => {
  const callUUID = '12345'; // Generate or use an identifier for the call
  RNCallKeep.startCall(callUUID, number, number);
  makeCall(number);
};
