//Add a room hash
location.hash = "#ffffff";
const roomHash = location.hash.substring(1);

//Scaler Drone channel id
const drone = new ScaleDrone('J2goW4x1Suo3Oz91');

// Room name initialization
const roomName = 'observable-' + roomHash;

//Let us use public google stun server
const ser = {
  //initializing google server
  iceServers: [{

    urls: 'stun:stun.l.google.com:19302' //google stun server

  }]
};
let room;
let pc;


//Function when connection is success
function success() {};

//Throw error if there is one
function onError(error) {
  console.error(error);
};

//If there is an error when connecting to the room
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  //subscribe to the room
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });

//Signaling server is ready.
room.on('members', members => {
	console.log('MEMBERS', members);
	// If we are the second user to connect to the room we will be creating the offer
	const isOfferer = members.length === 2;
	beginWebRTC(isOfferer);
  });
});

// Transfer signaling data via scale drone
function sendMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

//Starting WebRTC server
function beginWebRTC(isOfferer) {
  //new connection
  newCon = new RTCPeerConnection(ser);

  newCon.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  // If you are offerer, then let the 'negotiationneeded' event initiaite the offer creation
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescriptionCreated).catch(onError);
    }
  }

  // Display remote stream in the #remote element
  pc.ontrack = event => {
    const stream = event.streams[0];
    if (!remote.srcObject || (remote.srcObject.id !== stream.id)) {
      remote.srcObject = stream;
    }
  };


navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {

    // Displays our video in #local element
    local.srcObject = stream;

    // Send to peer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, onError);

  // Scale Drone sends signaling data
  room.on('data', (message, client) => {

    // We send message
    if (client.id === drone.clientId) {
      return;
    }

    if (message.sdp) {
      
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {

        // Answer when recieving an offer
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescriptionCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {

      //Adding ICE candidate
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), success, onError
      );
    }
  });
}

// Local Description Creation
function localDescriptionCreated(desc) {

  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );

}