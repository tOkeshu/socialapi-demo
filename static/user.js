function signedIn(aEmail) {
  $("#useridbox").text("Welcome " + aEmail + "!");
  $("#useridbox").show();
  $("#nouserid").hide();
}

function signedOut() {
  $("#useridbox").text("");
  $("#useridbox").hide();
  $("#nouserid").show(); 
}

// Did Persona really intend for it to be this way, what happens when it expires?
var gUserAssertion;

function startCall() {
  initiateCall(gUserAssertion, document.getElementById("contactEmail").value);
}

function onLoad() {
  if (navigator.id) {
    navigator.id.watch({
      loggedInUser: null,
      onlogin: function(assertion) {
        gUserAssertion = assertion;
        remoteLogin({assertion: assertion, noshow: true});
      },
      onlogout: function() {
        gUserAssertion = null;
        remoteLogout();
      }
    });
  }
}
