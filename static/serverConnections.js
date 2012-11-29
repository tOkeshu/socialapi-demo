function remoteLogin(options) {
  $.ajax({
    type: 'POST',
    url: '/login',
    data: options,
    success: function(res, status, xhr) { signedIn(xhr.responseText); },
    error: function(xhr, status, err) { alert("login failure" + err); }
  });
}

function remoteLogout() {
  $.ajax({
    type: 'POST',
    url: '/logout',
    success: function(res, status, xhr) { signedOut(); },
    error: function(xhr, status, err) { alert("logout failure" + err); }
  });
}

function initiateCall(aAssertion, aUser) {
  var options = {assertion: aAssertion, who: aUser };
  $.ajax({
    type: 'POST',
    url: '/call',
    data: options,
    success: function(res, status, xhr) {},
    error: function (xhr, status, err) { alert("call initiation failure " + err); }
  });
}

