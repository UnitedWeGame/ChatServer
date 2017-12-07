var http = require('http');
var fs  = require('fs');
var path = require('path');
var mime = require('mime');

var server = http.createServer(function(request, response) {
  // Website you wish to allow to connect
   response.setHeader('Access-Control-Allow-Origin', '*');

   // Request methods you wish to allow
   response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

   // Request headers you wish to allow
   response.setHeader('Access-Control-Allow-Headers', '*');

   // Set to true if you need the website to include cookies in the requests sent
   // to the API (e.g. in case you use sessions)
   response.setHeader('Access-Control-Allow-Credentials', true);
});

server.listen(process.env.PORT || 3000, function() {
  console.log("Server listening on port " + process.env.PORT);
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);
