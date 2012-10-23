socialapi-webrtc-demo
=====================

To start the server:
$ node app.js

Then edit about:config:

name: social.manifest.<foo>

value: {"location":"http://localhost:5000/manifest.json","name":"WebRTC Social Demo","iconURL":"http://localhost:5000/icon.png","workerURL":"http://localhost:5000/worker.js","sidebarURL":"http://localhost:5000/sidebar.htm","origin":"http://localhost:5000","enabled":true,"last_modified":135101330568}

or use the remote server:

value: {"location":"http://webrtc-social.herokuapp.com/manifest.json","name":"WebRTC Social Demo","iconURL":"http://webrtc-social.herokuapp.com/socialapi/icon.png","workerURL":"http://webrtc-social.herokuapp.com/socialapi/worker.js","sidebarURL":"http://webrtc-social.herokuapp.com/socialapi/sidebar.htm","origin":"http://webrtc-social.herokuapp.com","enabled":true,"last_modified":135101330568}