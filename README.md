socialapi-webrtc-demo
=====================

about:config entry:

name: social.manifest.<foo>

ln -s /web/server/socialapi /code/socialapi-demo

value: {"location":"http://localhost/socialapi/manifest.json","name":"WebRTC Social Demo","iconURL":"http://localhost/socialapi/icon.png","workerURL":"http://localhost/socialapi/worker.js","sidebarURL":"http://localhost/socialapi/sidebar.htm","origin":"http://localhost","enabled":true,"last_modified":135101330568}

To start the server:

$ node app.js
