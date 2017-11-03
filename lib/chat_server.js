var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var usernames = {};
var currentRoom = {};
var oneOnOnes;
var allConversations = [{"members": ["jacksonmeister", "logangster"],
			"messageList": [{type: 'text', author: "jacksonmeister", data: { text: "Why don't they have salsa on the table?"} },
                      {type: 'text', author: "logangster", data: { text: "What do you need salsa for?"} },
                      {type: 'text', author: "jacksonmeister", data: { text: "Salsa is now the number one condiment in America."} },]
    }];

exports.listen = function(server) {
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames);
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames);
    handleRoomJoining(socket);
    loadConversations(socket);
    handleMessageUsertoUser(socket);
    socket.on('rooms', function() {
      socket.emit('rooms', io.sockets.manager.rooms);
    });
    handleClientDisconnection(socket, nickNames);
  });
};

function assignGuestName(socket, guestNumber, nickNames) {
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  });
  return guestNumber + 1;
}

function loadConversations(socket) {
  socket.on('loadConversations', function(username) {
    console.log("LOADCONVERSATIONS: " + username);
    usernames[username] = socket;

    socket.emit("allConvos", findConversationsForUser(username));
  });
}

function handleMessageUsertoUser(socket) {
  socket.on('chatMessage', function(messageInfo) {
    updateOneToOneConversation(messageInfo.to, messageInfo.from, messageInfo.messageList);
    console.log(messageInfo.to);
    console.log(usernames);
    usernames[messageInfo.to].emit('newMessage', messageInfo);
  });
}

function findConversationsForUser(username) {
  var conversations = [];
  for (var index in allConversations) {
    var conversation = allConversations[index];
    if (conversation.members.indexOf(username) != -1)
      conversations.push(conversation);
  }
  return conversations;
}

function updateOneToOneConversation(to, from, messageList) {
  for (var index in allConversations) {
    var conversation = allConversations[index];
    if (conversation.members.length == 2 && conversation.members.indexOf(to) != -1
      && conversation.members.indexOf(from) != -1) {
        conversation.messageList = messageList;
        return;
      }
  }
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {room: room});
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients(room);
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text: usersInRoomSummary});
  }
}

function joinOneonOne(socket, userid) {
  room = 'OneOnOne-' + userid;
  socket.join(room);
  oneOnOnes[socket.id].push(room);
  socket.emit('joinResult', {room: room});
  /*socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });*/

  var usersInRoom = io.sockets.clients(room);
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text: usersInRoomSummary});
  }
}

function handleNameChangeAttempts(socket, nickNames) {
  socket.on('nameAttempt', function(name) {
      nickNames[socket.id] = name;
      socket.emit('nameResult', {
        success: true,
        name: name
      });
      /*socket.broadcast.to(currentRoom[socket.id]).emit('message', {
        text: previousName + ' is now known as ' + name + '.'
      });*/
  });
}

function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text,
      room: message.room
    });
  });
}

function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
  socket.on('joinOneOnOne', function(user) {
    socket.leave(currentRoom[socket.id]);
    joinOneOnOne(socket, user.id);
  });
}

function handleClientDisconnection(socket) {
  socket.on('disconnect', function() {
    delete nickNames[socket.id];
  });
}
