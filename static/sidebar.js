var gContacts = {};
var gChats = {};
var gUsername = "";

function onLoad() {
  var worker = navigator.mozSocial.getWorker();
  if (worker) {
    document.body.style.border = "3px solid green";
  } else {
    document.body.style.border = "3px solid red";
  }

  // force logout on reload for now, since we dont have real session
  // management for a real user
  document.cookie="userdata=";

navigator.id.watch({
  loggedInUser: null,
  onlogin: function(assertion) {
    // A user has logged in! Here you need to:
    // 1. Send the assertion to your backend for verification and to create a session.
    // 2. Update your UI.
    $.ajax({ /* <-- This example uses jQuery, but you can use whatever you'd like */
      type: 'POST',
      url: '/login', // This is a URL on your website.
      data: {assertion: assertion},
      success: function(res, status, xhr) { signedIn(xhr.responseText); },
      error: function(xhr, status, err) { alert("login failure" + res); }
    });
  },
  onlogout: function() {
    // A user has logged out! Here you need to:
    // Tear down the user's session by redirecting the user or making a call to your backend.
    // Also, make sure loggedInUser will get set to null on the next page load.
    // (That's a literal JavaScript null. Not false, 0, or undefined. null.)
    $.ajax({
      type: 'POST',
      url: '/logout', // This is a URL on your website.
      success: function(res, status, xhr) { },
      error: function(xhr, status, err) { alert("logout failure" + res); }
    });
  }
});
}

function onUnLoad() {
  $.ajax({type: 'POST', url: '/logout'});
}

function onContactDoubleClick(aEvent) {
  var to = aEvent.target.id;
  openChat(to, function(aWin) {
    var pc = new mozRTCPeerConnection();
    pc.onaddstream = function(obj) {
      //alert("sender onaddstream, obj = " + obj.toSource());
      //FIXME: do something with the received streams.
      // Currently they are always fake, so it doesn't matter.
    };
    gChats[to].pc = pc;
    getLocalVideo(aWin, pc, function() {
      pc.createOffer(function(offer) {
        pc.setLocalDescription(offer, function() {
          $.ajax({type: 'POST', url: '/offer',
                  data: {to: to, from: gUsername, request: JSON.stringify(offer)}});},
          function(err) { alert("setLocalDescription failed: " + err); });
      }, function(err) { alert("createOffer failed: " + err); });
    });
  });
}

function getLocalVideo(aWin, aPC, aSuccessCallback) {
  try {
    aWin.navigator.mozGetUserMedia({video: true}, function(stream) {
      var video = aWin.document.getElementById("video");
      video.mozSrcObject = stream;
      video.play();
      aPC.addStream(stream);
      aWin.navigator.mozGetUserMedia({audio: true}, function(stream) {
        var audio = aWin.document.getElementById("audio");
        audio.mozSrcObject = stream;
        audio.play();
        aPC.addStream(stream);
        aSuccessCallback();
      }, function(err) { alert("failed to get microphone: " + err); });
    }, function(err) { alert("failed to get camera: " + err); });
  } catch(e) { alert(e); }
}

function getFakeVideo(aWin, aPC, aSuccessCallback) {
  try {
    aWin.navigator.mozGetUserMedia({video: true, fake: true}, function(stream) {
      aPC.addStream(stream);
      aWin.navigator.mozGetUserMedia({audio: true, fake: true}, function(stream) {
        var audio = aWin.document.getElementById("audio");
        aPC.addStream(stream);
        aSuccessCallback();
      }, function(err) { alert("failed to get fake microphone: " + err); });
    }, function(err) { alert("failed to get fake camera: " + err); });
  } catch(e) { alert(e); }
}


function signin() {
  navigator.id.request();
}

function signedIn(aEmail) {
  var end = location.href.indexOf("sidebar.htm");
  var baselocation = location.href.substr(0, end);
  var userdata = {
    portrait: baselocation + "/user.png",
    userName: aEmail,
    dispayName: aEmail,
    profileURL: baselocation + "/user.html"
  }
  document.cookie="userdata="+JSON.stringify(userdata);

  gUsername = aEmail;
  gContacts[aEmail] = null; // Avoid displaying the user in the contact list.

  userIsConnected(userdata); // FIXME: remove once we have a working SocialAPI worker.
}

function signout() {
  navigator.id.logout();

  // send an empty user object to signal a signout to firefox
  document.cookie="userdata=";
  delete gContacts[gUsername];
  gUsername = "";

  userIsDisconnected(); // FIXME: remove once we have a working SocialAPI worker.
}

function openDataPanel(event) {
  // currently cant do this
  var url = "data:text/html,%3Chtml%3E%3Cbody%3E%3Cp%3EInline%20data%3C%2Fp%3E%3C%2Fbody%3E%3C%2Fhtml%3E";
  navigator.mozSocial.openPanel(url, event.clientY, function(win) {
	dump("window is opened "+win+"\n");
  });
}

function setupEventSource()
{
  var source = new EventSource("events");
  source.addEventListener("ping", function(e) {}, false);

  source.addEventListener("userjoined", function(e) {
    if (e.data in gContacts)
      return;
    var c = document.createElement("li");
    c.setAttribute("id", e.data);
    c.textContent = e.data;
    document.getElementById("contacts").appendChild(c);
    gContacts[e.data] = c;
  }, false);

  source.addEventListener("userleft", function(e) {
    if (!(e.data in gContacts)) {
      alert("unknown user left: " + e.data);
      return;
    }
    var c = gContacts[e.data];
    c.parentNode.removeChild(c);
    delete gContacts[e.data];
  }, false);

  source.addEventListener("offer", function(e) {
    var data = JSON.parse(e.data);
    openChat(data.from, function(aWin) {
      var pc = new mozRTCPeerConnection();
      var win = gChats[data.from].win;
      pc.onaddstream = function(obj) {
        var doc = win.document
        var type = obj.type;
        if (type = "video") {
          var video = doc.getElementById("video")
          video.mozSrcObject = obj.stream;
          video.play();
        }
        else if (type = "audio") {
          var audio = doc.getElementById("audio")
          audio.mozSrcObject = obj.stream;
          audio.play();
        }
        else
          alert("receiver onaddstream of unknown type, obj = " + obj.toSource());
      };
      gChats[data.from].pc = pc;
      pc.setRemoteDescription(JSON.parse(data.request), function() {
        getFakeVideo(win, pc, function() {
          pc.createAnswer(function(answer) {
            pc.setLocalDescription(answer, function() {
              $.ajax({type: 'POST', url: '/answer',
                      data: {to: data.from, from: data.to, request: JSON.stringify(answer)}});
            }, function(err) {alert("failed to setLocalDescription, " + err)});
          }, function(err) {alert("failed to createAnswer, " + err)});
        });
      }, function(err) {alert("failed to setRemoteDescription, " + err)});
    });
  }, false);

  source.addEventListener("answer", function(e) {
    var data = JSON.parse(e.data);
    gChats[data.from].pc.setRemoteDescription(JSON.parse(data.request), function() {
      // Nothing to do. The interesting things will happen in onaddstream.
    }, function(err) {alert("failed to setRemoteDescription with answer, " + err)});
  }, false);
}

function userIsConnected(userdata)
{
  $("#userid").text(userdata.userName);
  $("#usericon").attr("src", userdata.portrait);
  $("#useridbox").show();
  $("#usericonbox").show();
  $("#signin").hide();
  $("#content").show();
  setupEventSource();
}

function userIsDisconnected()
{
  $("#signin").show();
  $("#content").hide();
  $("#userid").text("");
  $("#usericon").attr("src", "");
  $("#useridbox").hide();
  $("#usericonbox").hide();
}

messageHandlers = {
  "worker.connected": function(data) {
    // our port has connected with the worker, do some initialization
    // worker.connected is our own custom message
    var worker = navigator.mozSocial.getWorker();
    worker.port.postMessage({topic: "broadcast.listen", data: true});
  },
  "social.user-profile": function(data) {
    if (data.userName)
      userIsConnected(data);
    else
      userIsDisconnected();
  },
};

navigator.mozSocial.getWorker().port.onmessage = function onmessage(e) {
    //dump("SIDEBAR Got message: " + e.data.topic + " " + e.data.data +"\n");
    var topic = e.data.topic;
    var data = e.data.data;
    if (messageHandlers[topic])
        messageHandlers[topic](data);
};

function workerReload() {
  var worker = navigator.mozSocial.getWorker();
  worker.port.postMessage({topic: "worker.reload", data: true});
}

function openPanel(event) {
  navigator.mozSocial.openPanel("./flyout.html", event.clientY, function(win) {
	dump("window is opened "+win+"\n");
  });
}

function openChat(aTarget, aCallback) {
  navigator.mozSocial.openChatWindow("./chatWindow.html?id="+(aTarget), function(win) {
	dump("chat window is opened "+win+"\n");
    gChats[aTarget] = {win: win, pc: null};
    win.document.title = aTarget;
    if (aCallback)
      aCallback(win);
  });
}

function changeLoc() {
  window.location = "http://www.mozilla.org";
}

window.addEventListener("scroll", function(e) {
  dump("scrolling sidebar...\n");
}, false);
window.addEventListener("socialFrameShow", function(e) {
  dump("status window has been shown, visibility is "+document.visibilityState+" or "+navigator.mozSocial.isVisible+"\n");
}, false);
window.addEventListener("socialFrameHide", function(e) {
  dump("status window has been hidden, visibility is "+document.visibilityState+" or "+navigator.mozSocial.isVisible+"\n");
}, false);

var chatters = 0;
function notify(type) {
  var port = navigator.mozSocial.getWorker().port;
  // XXX shouldn't need a full url here.
  var end = location.href.indexOf("sidebar.htm");
  var baselocation = location.href.substr(0, end);
  switch(type) {
    case "link":
      data = {
        id: "foo",
        type: null,
        icon: baselocation+"/icon.png",
        body: "This is a cool link",
        action: "link",
        actionArgs: {
          toURL: baselocation
        }
      }
      port.postMessage({topic:"social.notification-create", data: data});
      break;
    case "chat-request":
      port.postMessage({topic:"social.request-chat", data: baselocation+"/chatWindow.html?id="+(chatters++)});
      break;
  }
}

