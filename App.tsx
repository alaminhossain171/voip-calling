import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
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

// const ws = new WebSocket('wss://ivr.ibos.io:8089/ws', ['sip']);
// ws.onopen = () => console.log('WebSocket connected');
// ws.onerror = (error) => console.error('WebSocket error:', error);
// ws.onmessage = (message) => console.log('Message:', message.data);

const App = () => {
  const [target, setTarget] = useState('');

  useEffect(() => {
    try {
      requestPermissions();
      initializeSIP(
        'sip:7000@pbx.ibos.io',
        'wss#7000',
        'wss://pbx.ibos.io:8089/ws',
      );
      // Alert.alert('Success', 'Registered successfully.');
    } catch (error) {
      console.log('error', error);
    }
  }, []);

  const handleCall = () => {
    if (!target) {
      Alert.alert('Error', 'Please enter a target URI or phone number.');
      return;
    }
    makeCall(target);
  };

  const handleEndCall = () => {
    endCall();
    Alert.alert('Call', 'Call ended.');
  };

  const handleDial = digit => {
    setTarget(prev => prev + digit);
  };

  const handleRemove = () => {
    setTarget(prev => prev.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIP VoIP App</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Target URI or Phone Number"
        value={target}
        onChangeText={setTarget}
        editable={false}
      />

      <View style={styles.dialPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map(digit => (
          <TouchableOpacity
            key={digit}
            style={styles.dialButton}
            onPress={() => handleDial(digit.toString())}>
            <Text style={styles.dialText}>{digit}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Text style={styles.buttonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endButton} onPress={handleEndCall}>
          <Text style={styles.buttonText}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '90%',
    borderColor: '#ccc',
    padding: 15,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  dialPad: {
    width: '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  dialButton: {
    width: '30%',
    height: 60,
    marginVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
  },
  dialText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  endButton: {
    flex: 1,
    backgroundColor: '#F44336',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default App;
