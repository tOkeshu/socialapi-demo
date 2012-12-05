var gUserEmail;

function signedIn(aEmail) {
  gUserEmail = aEmail;
  $("#useridbox").text("Welcome " + aEmail + "!");
  $("#useridbox").show();
  $("#nouserid").hide();
  $("#signin").hide();
  $("#signout").show();
}

function signedOut() {
  gUserEmail = "";
  $("#useridbox").text("");
  $("#useridbox").hide();
  $("#nouserid").show(); 
  $("#signin").show();
  $("#signout").hide();
}

function startCall() {
  initiateCall(document.getElementById("contactEmail").value);
}

function onPersonaLogin(assertion) {
  // XXX this generates a second log in at the server, but we need it for remote connections.
  remoteLogin({assertion: assertion});
  //signedIn()
}

function onPersonaLogout() {
  // XXX Assume the sidebar handles the remote part of this.
  // We'll need to keep an eye out for changes if we close the sidebar.
  remoteLogout();
}

function onLoad() {
  watchPersonaLogins(onPersonaLogin, onPersonaLogout);
}
