import JsSIP from 'jssip';
import RNCallKeep from 'react-native-callkeep';
const uniqueCallUuid = `call-${Date.now()}-${Math.random()
  .toString(36)
  .substring(2, 15)}`;
export const sipState = {
  ua: null as JsSIP.UA | null,
  session: null as JsSIP.RTCSession | null,
};

export const initializeSIP = async (
  uri: string,
  password: string,
  socketUrl: string,
) => {
  try {
    const socket = new JsSIP.WebSocketInterface(socketUrl);

    const configuration = {
      sockets: [socket],
      uri: uri,
      password: password,
    };

    sipState.ua = new JsSIP.UA(configuration);

    sipState.ua.on('connected', () => {
      console.log('WebSocket connected.');
    });
    sipState.ua.on('disconnected', () => {
      console.log('WebSocket disconnected.');
    });
    sipState.ua.on('registered', () => {
      console.log('Registered successfully.');
    });
    sipState.ua.on('registrationFailed', e => {
      console.log('Registration failed:', e.cause);
    });
    sipState.ua.on('newRTCSession', handleIncomingCall);

    sipState.ua.start();
    console.log('SIP UA initialized and started.');
  } catch (error) {
    console.error('Error initializing SIP:', error);
  }
};

const handleIncomingCall = (data: {session: JsSIP.RTCSession}) => {
  sipState.session = data.session;

  if (sipState.session.direction === 'incoming') {
    const callerId = sipState.session.remote_identity.uri.toString();
    console.log('Incoming call from:', callerId);

    RNCallKeep.displayIncomingCall(
      uniqueCallUuid, // Generate a unique UUID for the call
      callerId,
      callerId,
    );

    RNCallKeep.addEventListener('answerCall', ({callUUID}) => {
      if (callUUID === uniqueCallUuid) {
        sipState.session?.answer({
          mediaConstraints: {audio: true, video: false},
        });

        sipState.session?.on('confirmed', () => {
          console.log('Call confirmed');
        });

        sipState.session?.on('ended', e => {
          console.log('Call ended:', e.cause);
          RNCallKeep.endCall(callUUID);
        });

        sipState.session?.on('failed', e => {
          console.error('Call failed:', e.cause);
          RNCallKeep.endCall(callUUID);
        });
      }
    });

    RNCallKeep.addEventListener('endCall', ({callUUID}) => {
      if (callUUID === uniqueCallUuid) {
        sipState.session?.terminate();
      }
    });
  }
};

export const makeCall = (target: string) => {
  let status = true;
  if (!sipState.ua) {
    console.error('SIP UA is not initialized.');
    return;
  }

  const targetUri = `sip:${target}@pbx.ibos.io`;
  const callUUID = 'outgoing-call-uuid';
  console.log(`Attempting to call: ${targetUri}`);
  RNCallKeep.startCall(callUUID, target, target);
  const eventHandlers = {
    progress: () => {
      console.log('Call is in progress');
      status = true;
      console.log(status);
      return false;
    },
    confirmed: () => console.log('Call confirmed'),
    ended: (e: {cause: string}) => {
      console.log('Call ended:', e.cause);
      status = false;
    },
    failed: (e: {cause: string} & Partial<{response: any}>) => {
      console.log('Call failed:', e.cause);
      if (e.response) {
        console.log('SIP Response:', e.response);
      }
      status = false;
    },
  };

  // const options = {
  //   eventHandlers,
  //   mediaConstraints: {audio: true, video: false},
  //   sessionTimersExpires: 30620,
  //   rtcOfferConstraints: {
  //     offerToReceiveAudio: true,
  //     offerToReceiveVideo: false,
  //   },
  //   sessionDescriptionHandlerOptions: {
  //     constraints: {audio: true, video: false},
  //   },
  //   codecs: ['opus', 'PCMU'],
  //   pcConfig: {
  //     iceServers: [
  //       {
  //         urls: [
  //           'stun:stun.l.google.com:19302',
  //           'stun:stun1.l.google.com:19302',
  //         ],
  //       },
  //     ],
  //   },
  // };

  const options = {
    eventHandlers,
    mediaConstraints: {audio: true, video: false},
    codecs: ['opus'],
    pcConfig: {
      iceServers: [{urls: ['stun:stun.l.google.com:19302']}],
    },
  };

  sipState.session = sipState.ua.call(targetUri, options);

  // sipState.session.on('sdp', e => {
  //   console.log('Original SDP:', e.sdp);

  //   let modifiedSdp = e.sdp;

  //   // Prioritize PCMU (codec 0) but keep other supported codecs intact
  //   modifiedSdp = prioritizeCodec(modifiedSdp, '0'); // Prioritize PCMU

  //   console.log('Modified SDP:', modifiedSdp);

  //   e.sdp = modifiedSdp; // Apply the modified SDP
  // });

  sipState.session.on('sdp', e => {
    // console.log('Original SDP:', e.sdp);

    const codecName = 'opus';
    e.sdp = prioritizeCodec(e.sdp, codecName);

    // console.log('Modified SDP with prioritized Opus:', e.sdp);
  });

  return status;
};

// const prioritizeCodec = (sdp: string, codecNumber: string): string => {
//   return sdp.replace(/^m=audio (\d+) [\w/]+ (.+)$/m, (match, port, codecs) => {
//     const codecList = codecs.split(' ').filter(c => c !== codecNumber);
//     if (!codecList.includes(codecNumber)) {
//       console.warn(`Codec ${codecNumber} is not in the original SDP.`);
//       return match; // Return unmodified SDP if codec doesn't exist.
//     }
//     return `m=audio ${port} UDP/TLS/RTP/SAVPF ${codecNumber} ${codecList.join(
//       ' ',
//     )}`;
//   });
// };

const prioritizeCodec = (sdp: string, codecName: string): string => {
  return sdp.replace(/^m=audio (\d+) [\w/]+ (.+)$/m, (match, port, codecs) => {
    const codecList = codecs.split(' ');
    const opusPayload = codecList.find(codec =>
      sdp.includes(`a=rtpmap:${codec} ${codecName}`),
    );

    if (!opusPayload) {
      // console.warn(`${codecName} is not in the original SDP.`);
      return match; // Return unmodified SDP if codec isn't found.
    }

    const reorderedCodecs = [
      opusPayload,
      ...codecList.filter(c => c !== opusPayload),
    ];
    return `m=audio ${port} UDP/TLS/RTP/SAVPF ${reorderedCodecs.join(' ')}`;
  });
};

export const endCall = () => {
  if (sipState.session) {
    RNCallKeep.endCall(uniqueCallUuid);
    sipState.session.terminate();
    console.log('Call terminated');
  } else {
    console.error('No active session to terminate.');
  }
};
// // JsSIP.debug.enable('JsSIP:*');

//@ts-nocheck
// import JsSIP from 'jssip';
// import RNCallKeep from 'react-native-callkeep';

// const sipState = {
//   ua: null as JsSIP.UA | null,
//   session: null as JsSIP.RTCSession | null,
// };

// export const initializeSIP = async (
//   uri: string,
//   password: string,
//   socketUrl: string,
// ) => {
//   try {
//     const socket = new JsSIP.WebSocketInterface(socketUrl);

//     const configuration = {
//       sockets: [socket],
//       uri: uri,
//       password: password,
//     };

//     sipState.ua = new JsSIP.UA(configuration);

//     sipState.ua.on('connected', () => {
//       console.log('WebSocket connected.');
//     });
//     sipState.ua.on('disconnected', () => {
//       console.log('WebSocket disconnected.');
//     });
//     sipState.ua.on('registered', () => {
//       console.log('Registered successfully.');
//     });
//     sipState.ua.on('registrationFailed', e => {
//       console.log('Registration failed:', e.cause);
//     });
//     sipState.ua.on('newRTCSession', handleIncomingCall);

//     sipState.ua.start();
//     console.log('SIP UA initialized and started.');
//   } catch (error) {
//     console.error('Error initializing SIP:', error);
//   }
// };

// const handleIncomingCall = (data: {session: JsSIP.RTCSession}) => {
//   sipState.session = data.session;

//   if (sipState.session.direction === 'incoming') {
//     const caller =
//       sipState.session.remote_identity.display_name ||
//       sipState.session.remote_identity.uri;

//     // Display the incoming call UI
//     RNCallKeep.displayIncomingCall(
//       'incoming-call-uuid',
//       caller,
//       caller,
//       'number',
//       false,
//     );

//     console.log('Incoming call from:', caller);

//     // Automatically answer the call
//     RNCallKeep.addEventListener('answerCall', () => {
//       sipState.session.answer({
//         mediaConstraints: {audio: true, video: false},
//       });

//       sipState.session.on('confirmed', () => {
//         console.log('Call confirmed');
//       });

//       sipState.session.on('ended', e => {
//         console.log('Call ended:', e.cause);
//       });

//       sipState.session.on('failed', e => {
//         console.error('Call failed:', e.cause);
//       });
//     });

//     // Handle call rejection
//     RNCallKeep.addEventListener('endCall', () => {
//       sipState.session.terminate();
//       console.log('Call terminated');
//     });
//   }
// };

// export const makeCall = (target: string) => {
//   if (!sipState.ua) {
//     console.error('SIP UA is not initialized.');
//     return;
//   }

//   const targetUri = `sip:${target}@pbx.ibos.io`;

//   // Notify CallKeep about the outgoing call
//   const callUUID = 'outgoing-call-uuid'; // Generate a unique UUID for the call
//   RNCallKeep.startCall(callUUID, target, target, 'number', false);

//   const eventHandlers = {
//     progress: () => {
//       console.log('Call is in progress');
//     },
//     confirmed: () => {
//       console.log('Call confirmed');
//     },
//     ended: (e: {cause: string}) => {
//       console.log('Call ended:', e.cause);
//       RNCallKeep.endCall(callUUID); // Notify CallKeep about the end of the call
//     },
//     failed: (e: {cause: string}) => {
//       console.error('Call failed:', e.cause);
//       RNCallKeep.endCall(callUUID); // Notify CallKeep about the failure
//     },
//   };

//   const options = {
//     eventHandlers,
//     mediaConstraints: {audio: true, video: false},
//     pcConfig: {
//       iceServers: [{urls: ['stun:stun.l.google.com:19302']}],
//     },
//   };

//   sipState.session = sipState.ua.call(targetUri, options);
// };

// export const endCall = () => {
//   if (sipState.session) {
//     sipState.session.terminate();
//     console.log('Call terminated');
//   } else {
//     console.error('No active session to terminate.');
//   }
// };
