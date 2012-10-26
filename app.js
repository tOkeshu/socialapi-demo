var express = require("express"),
    https   = require("https"),
    app     = express();

var debugLogging = true;
function debugLog(arg) {
  if (debugLogging) {
    console.log(arg);
  }
}

app.use(express.bodyParser());
app.use(express.cookieParser("thisistehsecret"));

app.use(express.session());
app.use(express.static(__dirname + "/static"));

var users = {};
var port = process.env.PORT || 5000;
var audience = process.env.AUDIENCE || "http://webrtc-social.herokuapp.com";


  
// We use EventSource for presence. The events are named "userjoined"
// and "userleft".

app.get("/events", function(req, res) {
  
  debugLog("/events connection opened");
  if (!req.session.user) {
    res.send(401, "Unauthorized, events access denied");
    return;
  }

  // Setup event channel.
  res.type("text/event-stream");
  var pinger = setTimeout(function() {
    if (!res) return;
    res.write("event: ping\n");
    res.write("data: ping\n\n");
  }, 1000);

  // Auto logout on disconnect.
  req.on("close", function() {
    clearInterval(pinger);
    logout(req, res, true);
  });

  // First notify this user of all users current.
  var keys = Object.keys(users);
  debugLog("number of known users: " + keys.length);
  for (var i = 0; i < keys.length; i++) {
    var user = keys[i];
    debugLog("about to send userjoined event, data: " + user);
    res.write("event: userjoined\n");
    res.write("data: " + user + "\n\n");
  }

  // Add to current list of online users.
  users[req.session.user] = res;
  debugLog("added " + req.session.user + " to users, # known now: " + 
           Object.keys(users).length);
  
});

app.post("/login", function(req, res) {
  if (!req.body.assertion) {
    res.send(500, "Invalid login request");
    return;
  }
  verifyAssertion(req.body.assertion, audience, function(val) {
    if (val) {
      req.session.regenerate(function() {
        req.session.user = val;
        notifyAllAbout(val, "userjoined");
        res.send(200, val);
      });
    } else {
      res.send(401, "Invalid Persona assertion");
    }
  });
});

// quiet is set to true when the connection has been closed by the client, so 
// sending a response will cause an error
function logout(req, res, quiet) {
  if (!req.session.user && !quiet) {
    res.send(401, "No user currently logged in");
    return;
  }

  var user = req.session.user;
  req.session.destroy(function() {
    notifyAllAbout(user, "userleft");
    delete users[user];
    if (!quiet) { 
      res.send(200);
    }
  });
}

app.post("/logout", logout);

app.post("/offer", function(req, res) {
  processRequest(req, res, "offer");
});

app.post("/answer", function(req, res) {
  processRequest(req, res, "answer");
});

app.listen(port, function() {
  debugLog("Port is " + port + " with audience " + audience);
});

// Helper functions.

function processRequest(req, res, type) {
  if (!req.session.user) {
    res.send(401, "Unauthorized, " + type + " access denied");
    return;
  }

  if (!req.body.to || !req.body.from || !req.body.request) {
    res.send(400, "Invalid " + type + " request");
    return;
  }

  var channel = users[req.body.to];
  if (!channel) {
    res.send(400, "Invalid user for " + type);
    return;
  }

  channel.write("event: " + type + "\n");
  channel.write("data: " + JSON.stringify(req.body));
  channel.write("\n\n");

  res.send(200);
}

function notifyAllAbout(user, type) {
  var keys = Object.keys(users);
  for (var i = 0; i < keys.length; i++) {
    var channel = users[keys[i]];
    debugLog("about to channel write in notifyAllAbout; event type: " + type + ", data: " + user);
    channel.write("event: " + type + "\n");
    channel.write("data: " + user + "\n\n");
  }
}

function verifyAssertion(ast, aud, cb) {
  var data = "audience=" + encodeURIComponent(aud);
  data += "&assertion=" + encodeURIComponent(ast);

  var options = {
    host: "verifier.login.persona.org",
    path: "/verify",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": data.length
    }
  };

  var req = https.request(options, function(res) {
    var ret = "";
    res.on("data", function(chunk) {
      ret += chunk;
    });
    res.on("end", function() {
      try {
        var val = JSON.parse(ret);
      } catch(e) {
        cb(false);
        return;
      }
      if (val.status == "okay") {
        cb(val.email);
      } else {
        debugLog(data);
        debugLog(val);
        cb(false);
      }
    });
  });

  req.write(data);
  req.end();
}
