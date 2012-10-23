var express = require("express"),
    https   = require("https"),
    app     = express();

app.use(express.bodyParser());
app.use(express.cookieParser("thisistehsecret"));

app.use(express.session());
app.use(express.static(__dirname + "/static"));

var port = process.env.PORT || 5000;
var audience = process.env.AUDIENCE || "http://webrtc-social.herokuapp.com";

app.listen(port, function() {
  console.log("Port is " + port + " with audience " + audience);
});
