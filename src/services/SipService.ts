import JsSIP from 'jssip';

const sipState = {
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

    sipState.ua.on('connected', () => console.log('WebSocket connected.'));
    sipState.ua.on('disconnected', () =>
      console.log('WebSocket disconnected.'),
    );
    sipState.ua.on('registered', () => console.log('Registered successfully.'));
    sipState.ua.on('registrationFailed', e =>
      console.log('Registration failed:', e.cause),
    );
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
    console.log('Incoming call from:', sipState.session.remote_identity.uri);

    sipState.session.answer({
      mediaConstraints: {audio: true, video: false},
    });

    sipState.session.on('confirmed', () => {
      console.log('Call confirmed');
    });

    sipState.session.on('ended', e => {
      console.log('Call ended:', e.cause);
    });

    sipState.session.on('failed', e => {
      console.error('Call failed:', e.cause);
    });
  }
};

export const makeCall = (target: string) => {
  if (!sipState.ua) {
    console.error('SIP UA is not initialized.');
    return;
  }

  const targetUri = `sip:${target}@pbx.ibos.io`;
  console.log(`Attempting to call: ${targetUri}`);

  const eventHandlers = {
    progress: () => console.log('Call is in progress'),
    confirmed: () => console.log('Call confirmed'),
    ended: (e: {cause: string}) => console.log('Call ended:', e.cause),
    failed: (e: {cause: string} & Partial<{response: any}>) => {
      console.log('Call failed:', e.cause);
      if (e.response) {
        console.log('SIP Response:', e.response);
      }
    },
  };

  const options = {
    eventHandlers,
    mediaConstraints: {audio: true, video: false},
    // sessionTimersExpires: 120,
    rtcOfferConstraints: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    },
    sessionDescriptionHandlerOptions: {
      constraints: {audio: true, video: false},
    },
    codecs: ['opus', 'PCMU'],
    pcConfig: {
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
          ],
        },
      ],
    },
  };

  sipState.session = sipState.ua.call(targetUri, options);

  sipState.session.on('sdp', e => {
    console.log('Original SDP:', e.sdp);

    let modifiedSdp = e.sdp;

    // Prioritize PCMU (codec 0) but keep other supported codecs intact
    modifiedSdp = prioritizeCodec(modifiedSdp, '0'); // Prioritize PCMU

    console.log('Modified SDP:', modifiedSdp);

    e.sdp = modifiedSdp; // Apply the modified SDP
  });
};

const prioritizeCodec = (sdp: string, codecNumber: string): string => {
  return sdp.replace(/^m=audio (\d+) [\w/]+ (.+)$/m, (match, port, codecs) => {
    const codecList = codecs.split(' ').filter(c => c !== codecNumber);
    if (!codecList.includes(codecNumber)) {
      console.warn(`Codec ${codecNumber} is not in the original SDP.`);
      return match; // Return unmodified SDP if codec doesn't exist.
    }
    return `m=audio ${port} UDP/TLS/RTP/SAVPF ${codecNumber} ${codecList.join(
      ' ',
    )}`;
  });
};

export const endCall = () => {
  if (sipState.session) {
    sipState.session.terminate();
    console.log('Call terminated');
  } else {
    console.error('No active session to terminate.');
  }
};
// JsSIP.debug.enable('JsSIP:*');
