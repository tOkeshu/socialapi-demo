socialapi-webrtc-demo
=====================

about:config entry:

name: social.manifest.<foo>

ln -s /web/server/socialapi /code/socialapi-demo

value: {"location":"http://localhost/socialapi/static/manifest.json","name":"WebRTC Social Demo","iconURL":"http://localhost/socialapi/static/icon.png","workerURL":"http://localhost/socialapi/static/worker.js","sidebarURL":"http://localhost/socialapi/static/sidebar.htm","origin":"http://localhost","enabled":true,"last_modified":135101330568}

To start the server:

$ node app.js
