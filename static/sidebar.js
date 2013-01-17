var gContacts = {};
var gChats = {};
var gUsername = "";
var gFake = false;

function onPersonaLogin(assertion) {
  $("#guest").hide();
  $("#signin").hide();
  remoteLogin({assertion: assertion});
}

function onPersonaLogout(assertion) {
  if (gUsername)
    remoteLogout();
}

function onPersonaReady() {
  if (gUsername || remoteLoginPending)
    return;
  $("#guest").show();
  $("#signin").show();
}

function onLoad() {
  var worker = navigator.mozSocial.getWorker();
  if (!worker) {
    document.body.style.border = "3px solid red";
  }

  watchPersonaLogins(onPersonaLogin, onPersonaLogout, onPersonaReady);
}

function onContactClick(aEvent) {
  callPerson(aEvent.target.innerHTML);
}

function callPerson(aPerson) {
  // Check first if the person is already calling us...
  if (aPerson in gChats) {
    // If a call is ringing, accept it.
    var doc = gChats[aPerson].win.document;
    if (doc.getElementById("callAnswer").style.display == "block")
      doc.getElementById("accept").onclick();
    return;
  }

  openChat(aPerson, function(aWin) {
    var win = gChats[aPerson].win;
    var doc = win.document;
    doc.getElementById("calling").style.display = "block";
    gChats[aPerson].pc = webrtcMedia.startCall(aPerson, win, false,
                                               onConnection, setupFileSharing);
    gChats[aPerson].audioOnly = false;
  });
}

function startGuest() {
  $("#signin").hide();
  $("#guest").html(
    '<input type="text" id="user"/>' +
    '<input type="button" value="Login" onclick="javascript:guestLogin();"/>'
  );
  $("#user").focus();
}

function guestLogin() {
  var user = $("#user").attr("value");
  remoteLogin({assertion: user, fake: true});
  gFake = true;
}

function signedIn(aEmail) {
  $("#guest").hide();
  $("#signin").hide();
  var end = location.href.indexOf("/sidebar.htm");
  var baselocation = location.href.substr(0, end);
  var userdata = {
    portrait: baselocation + "/user.png",
    userName: aEmail,
    dispayName: aEmail,
    profileURL: baselocation + "/user.html"
  };
  document.cookie="userdata="+JSON.stringify(userdata);
  window.addEventListener("unload", function() {
    document.cookie = 'userdata=; expires=Fri, 27 Jul 2001 02:47:11 UTC; path=/';
  });

  gUsername = aEmail;
  gContacts[aEmail] = $("<li>"); // Avoid displaying the user in the contact list.
}

function onSignout() {
  if (!gFake)
    signout();
  else {
    gFake = false;
    onPersonaLogout();
  }
}

function signedOut() {
  delete gContacts[gUsername];
  gUsername = "";

  reload();
}

function onConnection(aWin, aPc, aPerson, aOriginator) {
  // Do we need to set up a data connection itself?
  if (aOriginator)
    setupFileSharing(aWin, aPc.createDataChannel("SocialAPI", {}), aPerson);

  // Now set up the chat interface
  aWin.document.getElementById("chatForm").onsubmit = function() {
    var localChat = aWin.document.getElementById("localChat");
    var message = localChat.value;
    gChats[aPerson].dc.send(message);
    localChat.value = "";
    // XXX: Sometimes insertChatMessage throws an exception, don't know why yet.
    try {
      insertChatMessage(aWin, "Me", message);
    } catch(e) {}
    return false;
  };
  aWin.document.getElementById("localChat").removeAttribute("disabled");
}

function insertChatMessage(win, from, message) {
  var box = win.document.getElementById("chat");
  box.innerHTML += "<span class=\"" + from + "\">" + from + "</span>: " + message + "<br/>";
  box.scrollTop = box.scrollTopMax;
}

var filename = "default.txt";

function gotChat(win, evt) {
  if (evt.data instanceof Blob) {
    // for file transfer.
    saveAs(evt.data, filename);
  } else {
    // either an incoming file or chat.
    try {
      var details = JSON.parse(evt.data);
      if (details.type == "file") {
        filename = details.filename;
      } else if (details.type == "url") {
        win.open(details.url);
      } else {
        throw new Error("JSON, but not a file");
      }
    } catch(e) {
      insertChatMessage(win, "Them", evt.data);
    }
  }
}

function setupFileSharing(win, dc, target) {
  /* Setup data channel */
  dc.binaryType = "blob";
  dc.onmessage = function(evt) {
    gotChat(win, evt);
  };
  gChats[target].dc = dc;

  /* Setup drag and drop for file transfer */
  var box = win.document.getElementById("content");
  box.addEventListener("dragover", ignoreDrag, false);
  box.addEventListener("dragleave", ignoreDrag, false);
  box.addEventListener("drop", handleDrop, false);

  function ignoreDrag(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    if (e.type == "dragover") {
      win.document.getElementById("fileDrop").style.display = "block";
    } else {
      win.document.getElementById("fileDrop").style.display = "none";
    }
  }

  function handleDrop(e) {
    ignoreDrag(e);
    var files = e.target.files || e.dataTransfer.files;
    if (files.length) {
      for (var i = 0, f; f = files[i]; i++) {
        dc.send(JSON.stringify({type: "file", filename: f.name}));
        dc.send(f);
      }
    } else {
      var url = e.dataTransfer.getData("URL");
      if (!url.trim()) {
        url = e.dataTransfer.mozGetDataAt("text/x-moz-text-internal", 0);
      }
      dc.send(JSON.stringify({type: "url", url: url}));
    }
  }
}

function finishDetachTab(aWindow) {
  var doc = aWindow.document;
  var localVideo = doc.getElementById("localVideo");
  var video = doc.getElementById("remoteVideo");
  video.setAttribute("style", "position: fixed; top: 0; left: 0; z-index: 1; background: black;");

  var resizeVideo = function() {
    var height = aWindow.innerHeight;
    var width = aWindow.innerWidth;

    video.setAttribute("width", width);
    video.setAttribute("height", height);

    localVideo.setAttribute("width", "108");
    localVideo.setAttribute("height", "81");
    localVideo.setAttribute("style", "position: fixed; z-index: 2;");
    localVideo.style.top = (height - 81) + "px";
    localVideo.style.left = (width - 108) + "px";
  };
  resizeVideo();
  aWindow.addEventListener("resize", resizeVideo);

  var button = doc.getElementById("fullTab");
  button.onclick = function() {
    doc.getElementById("video").mozRequestFullScreen();
  };
  button.textContent = "Full screen";
}

function setupExpandHandler(win) {
  win.document.getElementById("fullTab").onclick = function() {
    var doc = win.document;
    var event = doc.createEvent("UIEvents");
    event.initUIEvent("detachToTab", true, true, win, 0);
    win.dispatchEvent(event);

    if (!event.defaultPrevented) {
      // The add-on isn't installed, fallback to opening a new tab and
      // keeping the floating window around.
      var tab = win.open(win.location);
      tab.addEventListener("DOMContentLoaded", function() {
        tab.document.title = win.document.title;

        var video = doc.getElementById("remoteVideo");
        var newVideo = tab.document.getElementById("remoteVideo");
        newVideo.mozSrcObject = video.mozSrcObject;
        newVideo.play();

        var localVideo = doc.getElementById("localVideo");
        var newLocalVideo = tab.document.getElementById("localVideo");
        newLocalVideo.mozSrcObject = localVideo.mozSrcObject;
        newLocalVideo.play();
        finishDetachTab(tab);
      });
    }
    else
      finishDetachTab(doc.defaultView);
  };
}

function setupEventSource() {
  var source = new EventSource("events?source=sidebar");
  source.onerror = function(e) {
    reload();
  };

  source.addEventListener("ping", function(e) {}, false);

  source.addEventListener("userjoined", function(e) {
    if (e.data in gContacts) {
      return;
    }
    var button = $('<button class="userButton">' + e.data + '</button>');
    var c = $("<li>");
    $("#contacts").append(c.append(button));
    button.click(onContactClick);
    gContacts[e.data] = c;
  }, false);

  source.addEventListener("userleft", function(e) {
    if (!gContacts[e.data]) {
      return;
    }
    gContacts[e.data].remove();
    delete gContacts[e.data];
  }, false);

  source.addEventListener("offer", function(e) {
    var data = JSON.parse(e.data);
    var from = data.from;

    // Silently drop calls from people already calling us.
    // The server won't cancel the ongoing call if there's a pending call.
    if (from in gChats) {
      stopCall(from);
      return;
    }

    openChat(from, function(aWin) {
      var win = gChats[from].win;
      var doc = win.document;
      var offer = JSON.parse(data.request);
      offer.sdp = offer.sdp.split("m=").filter(function(s) {
        return !s.startsWith("video") || s.indexOf("a=recvonly") == -1;
      }).join("m=");
      gChats[from].audioOnly = offer.sdp.indexOf("m=video") == -1;

      doc.getElementById("callAnswer").style.display = "block";
      doc.getElementById("reject").onclick = function() {
        win.close();
      };
      doc.getElementById("accept").onclick = function() {
        doc.getElementById("callAnswer").style.display = "none";
        gChats[from].pc = webrtcMedia.handleOffer(data, win, gChats[from].audioOnly,
                                                  onConnection, setupFileSharing);
      };
    });
  }, false);

  source.addEventListener("answer", function(e) {
    var data = JSON.parse(e.data);
    var chat = gChats[data.from];
    var answer = JSON.parse(data.request);
    var pc = chat.pc;
    if (!chat.audioOnly && answer.sdp.indexOf("m=video") == -1) {
      chat.audioOnly = true;
      var video = chat.win.document.getElementById("localVideo");
      pc.removeStream(video.mozSrcObject);
      video.pause();
      if (video.mozSrcObject)
        video.mozSrcObject.stop();
      video.mozSrcObject = null;
    }
    chat.win.document.getElementById("warning").style.display = "none";
    chat.win.document.getElementById("calling").style.display = "none";
    pc.setRemoteDescription(answer, function() {
      // Nothing to do for the audio/video. The interesting things for
      // them will happen in onaddstream.
      // We need to establish the data connection though.
      if (data.callerPort && data.calleePort)
        pc.connectDataConnection(data.callerPort, data.calleePort);
    }, function(err) {alert("failed to setRemoteDescription with answer, " + err);});
  }, false);

  source.addEventListener("call", function(e) {
    var data = JSON.parse(e.data);
    callPerson(data.who);
  }, false);

  source.addEventListener("stopcall", function(e) {
    var data = JSON.parse(e.data);
    var chat = gChats[data.from];
    if (!chat) {
      // The chat to close doesn't exist any more...
      return;
    }
    webrtcMedia.endCall(chat.pc, chat.dc, chat.win, chat.audioOnly);
    var warning = chat.win.document.getElementById("warning");
    warning.textContent = data.reason || "The call has been closed.";
    warning.style.display = "block";
    chat.win.document.getElementById("calling").style.display = "none";
    setTimeout(function() {
      chat.win.close();
      delete gChats[data.from];
    }, 10000);
  });

  window.addEventListener("beforeunload", function() {
    source.onerror = null;
    source.close();
  }, true);
}

function userIsConnected(userdata) {
  $("#userid").text(userdata.userName);
  $("#usericon").attr("src", userdata.portrait);
  $("#useridbox").show();
  $("#usericonbox").show();
  $("#content").show();
  setupEventSource();
}

function userIsDisconnected() {
  $("#content").hide();
  $("#userid").text("");
  $("#usericon").attr("src", "");
  $("#useridbox").hide();
  $("#usericonbox").hide();
}

var messageHandlers = {
  "worker.connected": function(data) {
    // our port has connected with the worker, do some initialization
    // worker.connected is our own custom message
    var worker = navigator.mozSocial.getWorker();
    worker.port.postMessage({topic: "broadcast.listen", data: true});
  },
  "social.user-profile": function(data) {
    if (data.userName) {
      userIsConnected(data);
    } else {
      userIsDisconnected();
    }
  }
};

navigator.mozSocial.getWorker().port.onmessage = function onmessage(e) {
  var topic = e.data.topic;
  var data = e.data.data;
  if (messageHandlers[topic]) {
    messageHandlers[topic](data);
  }
};

function reload() {
  navigator.mozSocial.getWorker()
           .port.postMessage({topic: "worker.reload", data: true});
  window.location.reload();
}

function openChat(aTarget, aCallback) {
  navigator.mozSocial.openChatWindow("./chatWindow.html?id="+(aTarget), function(win) {
    gChats[aTarget] = {win: win, pc: null};
    win.document.title = aTarget;
    setupExpandHandler(win);
    win.addEventListener("unload", function() {
      if (!(aTarget in gChats))
        return;
      stopCall(aTarget);
      var chat = gChats[aTarget];
      webrtcMedia.endCall(chat.pc, chat.dc, chat.win, chat.audioOnly);
      delete gChats[aTarget];
    });
    if (aCallback) {
      aCallback(win);
    }
  });
}

var chatters = 0;
function notify(type) {
  var port = navigator.mozSocial.getWorker().port;
  // XXX shouldn't need a full url here.
  var end = location.href.indexOf("sidebar.htm");
  var baselocation = location.href.substr(0, end);
  switch (type) {
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
      };
      port.postMessage({topic:"social.notification-create", data: data});
      break;
    case "chat-request":
      port.postMessage({topic:"social.request-chat", data: baselocation+"/chatWindow.html?id="+(chatters++)});
      break;
  }
}
