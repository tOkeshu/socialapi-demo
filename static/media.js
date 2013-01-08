// This object currently assumes the following elements are defined in the web page for calls:
// remoteVideo, remoteAudio, localVideo, localAudio
var webrtcMedia = {
  startCall: function webrtcMedia_startCall(aPerson, aAudioOnly) {
    var pc = this._createBasicPc();
    setupDataChannel(true, pc, aPerson);
    (aAudioOnly ? getAudioOnly : getAudioVideo)(window,
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

  handleOffer: function webrtcMedia_handleOffer(aData) {
    var pc = this._createBasicPc();
    setupDataChannel(false, pc, aData.from);
    pc.setRemoteDescription(JSON.parse(aData.request), function() {
      getAudioVideo(window, pc, function() {
        pc.createAnswer(function(answer) {
          pc.setLocalDescription(answer, function() {
            $.ajax({type: 'POST', url: '/answer',
                    data: {to: aData.from, request: JSON.stringify(answer)}});
            pc.connectDataConnection(5001,5000);
          }, function(err) {alert("failed to setLocalDescription, " + err);});
        }, function(err) {alert("failed to createAnswer, " + err);});
      }, true);
    }, function(err) {alert("failed to setRemoteDescription, " + err);});
    return pc;
  },

  endCall: function webrtcMedia_stopCall(pc, aAudioOnly) {
    var mediaElements = ["remoteAudio", "localAudio"];
    if (!aAudioOnly)
      mediaElements = mediaElements.concat("remoteVideo", "localVideo");

    // Stop each media element
    mediaElements.forEach(function (aElemId) {
      var element = document.getElementById(aElemId);
      element.pause();
      if (aElemId.indexOf("local") != -1) {
        if (pc)
          pc.removeStream(element.mozSrcObject);
        if (element.mozSrcObject)
          element.mozSrcObject.stop();
      }
      element.mozSrcObject = null;
    });

    if (pc)
      pc.close();
  },

  _createBasicPc: function webrtcMedia_createBasicPc() {
    var pc = new window.mozRTCPeerConnection();
    pc.onaddstream = function(obj) {
      var type = obj.type;
      if (type == "video") {
        var video = document.getElementById("remoteVideo");
        video.mozSrcObject = obj.stream;
        video.play();
      } else if (type == "audio") {
        var audio = document.getElementById("remoteAudio");
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
