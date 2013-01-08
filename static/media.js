// This object currently assumes the following elements are defined in the web page for calls:
// remoteVideo, remoteAudio, localVideo, localAudio
var webrtcMedia = {
  startCall: function webrtcMedia_startCall(aPerson, aWin, aAudioOnly) {
    var pc = this._createBasicPc(aWin);
    setupDataChannel(true, pc, aPerson);
    (aAudioOnly ? getAudioOnly : getAudioVideo)(aWin,
      pc,
      function() {
        pc.createOffer(function(offer) {
          pc.setLocalDescription(offer, function() {
            $.ajax({type: 'POST', url: '/offer',
            data: {to: aPerson, request: JSON.stringify(offer)}});},
            function(err) { alert("setLocalDescription failed: " + err);
          });
        }, function(err) { alert("createOffer failed: " + err); });
      });
    return pc;
  },

  handleOffer: function webrtcMedia_handleOffer(aData, aWin, aAudioOnly) {
    var pc = this._createBasicPc(aWin);
    setupDataChannel(false, pc, aData.from);
    pc.setRemoteDescription(JSON.parse(aData.request), function() {
      (aAudioOnly ? getAudioOnly : getAudioVideo)(aWin, pc, function() {
        pc.createAnswer(function(answer) {
          pc.setLocalDescription(answer, function() {
            var randomPort = function() {
              return Math.round(Math.random() * 60535) + 5000;
            };
            var localPort = randomPort();
            var remotePort = randomPort();
            while (remotePort == localPort) // Avoid being extremely unlucky...
              remotePort = randomPort();
            $.ajax({type: 'POST', url: '/answer',
                    data: {to: aData.from, request: JSON.stringify(answer),
                           callerPort: remotePort, calleePort: localPort}});
            pc.connectDataConnection(localPort, remotePort);
          }, function(err) {alert("failed to setLocalDescription, " + err);});
        }, function(err) {alert("failed to createAnswer, " + err);});
      }, true);
    }, function(err) {alert("failed to setRemoteDescription, " + err); });

    return pc;
  },

  endCall: function webrtcMedia_stopCall(aPc, aDc, aWin, aAudioOnly) {
    var mediaElements = ["remoteAudio", "localAudio"];
    if (!aAudioOnly)
      mediaElements = mediaElements.concat("remoteVideo", "localVideo");

    // Stop each media element
    mediaElements.forEach(function (aElemId) {
      var element = aWin.document.getElementById(aElemId);
      element.pause();
      if (aElemId.indexOf("local") != -1) {
        if (aPc)
          aPc.removeStream(element.mozSrcObject);
        if (element.mozSrcObject)
          element.mozSrcObject.stop();
      }
      element.mozSrcObject = null;
    });

    if (aPc)
      aPc.close();
    if (aDc)
      aDc.close();
  },

  _createBasicPc: function webrtcMedia_createBasicPc(aWin) {
    var pc = new aWin.mozRTCPeerConnection();
    pc.onaddstream = function(obj) {
      var type = obj.type;
      if (type == "video") {
        var video = aWin.document.getElementById("remoteVideo");
        video.mozSrcObject = obj.stream;
        video.play();
      } else if (type == "audio") {
        var audio = aWin.document.getElementById("remoteAudio");
        audio.mozSrcObject = obj.stream;
        audio.play();
      } else {
        alert("sender onaddstream of unknown type, obj = " + obj.toSource());
      }
    };
    return pc;
  }
};

function getAudioOnly(aWin, aPC, aSuccessCallback, aCanFake) {
  try {
    getAudio(aWin, function(stream) {
      var audio = aWin.document.getElementById("localAudio");
      audio.mozSrcObject = stream;
      audio.play();
      aPC.addStream(stream);
      aSuccessCallback();
    }, function(err) { alert("failed to get microphone: " + err); }, true);
  } catch(e) { alert(e); }
}

function getAudioVideo(aWin, aPC, aSuccessCallback, aCanFake) {
  try {
    getVideo(aWin, function(stream) {
      var video = aWin.document.getElementById("localVideo");
      video.mozSrcObject = stream;
      video.play();
      aPC.addStream(stream);
      getAudioOnly(aWin, aPC, aSuccessCallback, aCanFake);
    }, function(err) { alert("failed to get camera: " + err); }, true);
  } catch(e) { alert(e); }
}

function getVideo(aWin, aSuccessCallback, aErrorCallback, aCanFake) {
  aWin.navigator.mozGetUserMedia({video: true}, function(stream) {
    aSuccessCallback(stream);
  }, function(err) {
    if (aCanFake && err == "HARDWARE_UNAVAILABLE") {
      aWin.navigator.mozGetUserMedia({video: true, fake: true}, aSuccessCallback, aErrorCallback);
    } else {
      aErrorCallback(err);
    }
  });
}

function getAudio(aWin, aSuccessCallback, aErrorCallback, aCanFake) {
  aWin.navigator.mozGetUserMedia({audio: true}, function(stream) {
    aSuccessCallback(stream);
  }, function(err) {
    if (aCanFake && err == "HARDWARE_UNAVAILABLE") {
      aWin.navigator.mozGetUserMedia({audio: true, fake: true}, aSuccessCallback, aErrorCallback);
    } else {
      aErrorCallback(err);
    }
  });
}
