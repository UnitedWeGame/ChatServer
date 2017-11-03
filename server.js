var http = require('http');
var fs  = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

function send404(response) {
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('Error 404: resource not found.');
  response.end();
}

function sendFile(response, filePath, fileContents) {
  response.writeHead(
    200,
    {"content-type": mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath]);
  } else {
    fs.exists(absPath, function(exists) {
      if (exists) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(response);
          } else {
            cache[absPath] = data;
            sendFile(response, absPath, data);
          }
        });
      } else {
        send404(response);
      }
    });
  }
}

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
