var express = require("express"),
    https   = require("https"),
    app     = express();

app.use(express.bodyParser());
app.use(express.cookieParser("thisistehsecret"));

app.use(express.session());
app.use(express.static(__dirname + "/static"));

var users = {};
var port = process.env.PORT || 5000;
var audience = process.env.AUDIENCE || "http://webrtc-social.herokuapp.com";

// We use EventSource for presence. The events are named "userjoined"
// and "userleft".

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
        res.send(200);
      });
    } else {
      res.send(401, "Invalid Persona assertion");
    }
  });
});

app.post("/logout", function(req, res) {
  if (!req.session.user) {
    res.send(401, "No user currently logged in");
    return;
  }

  var user = req.session.user;
  req.session.destroy(function() {
    notifyAllAbout(user, "userleft");
    res.send(200);
  });
});

app.listen(port, function() {
  console.log("Port is " + port + " with audience " + audience);
});

// Helper functions.

function notifyAllAbout(user, type) {
  var keys = Object.keys(users);
  for (var i = 0; i < keys.length; i++) {
    var channel = users[keys[i]];
    channel.write("event: " + type + "\n");
    channel.write("data: " + user + "\n\n");
  }
}

function verifyAssertion(ast, aud, cb) {
  if (!process.env.ONLINE) {
    cb(ast);
    return;
  }

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
        console.log(data);
        console.log(val);
        cb(false);
      }
    });
  });

  req.write(data);
  req.end();
}
