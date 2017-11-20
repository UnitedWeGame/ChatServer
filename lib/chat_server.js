var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var usernames = {};
var currentRoom = {};
var savedUsernames = ["jacksonmeister", "logangster", "kelpaso"];
var oneOnOnes;
var allConversations = [{"members": ["jacksonmeister", "logangster"],
			"messageList": [{type: 'text', author: "jacksonmeister", data: { text: "Hey Logan!"} },
                      {type: 'text', author: "logangster", data: { text: "What's up jackson??"} },
                      {type: 'text', author: "jacksonmeister", data: { text: "Just working on Senior Proj."} }]
    },
    {"members": ["jacksonmeister", "kelpaso"],
    			"messageList": [{type: 'text', author: "jacksonmeister", data: { text: "Dude are you ready to play MLP?"} },
                          {type: 'text', author: "kelpaso", data: { text: "I'm excited! Brony for life!"} },
                          {type: 'text', author: "jacksonmeister", data: { text: "Settle down Kelsey."} }]
        },
        {"members": ["kelpaso", "logangster"],
        			"messageList": [{type: 'text', author: "kelpaso", data: { text: "Hey Logan!"} },
                              {type: 'text', author: "logangster", data: { text: "Not now, I'm a little busy"} },
                              {type: 'text', author: "kelpaso", data: { text: "Wow, jerk."} }]
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

    var conversations = JSON.parse(JSON.stringify(findConversationsForUser(username)));

		if (conversations.length == 0) {
			for (var index in usernames) {
				var conversation = {"members": [username, usernames[index]], "messageList": []};
				conversations.push(conversation);
				allConversations.push(conversation)
			}
			for (var index in savedUsernames) {
				if (typeof usernames[savedUsernames[index]] == "undefined") {
					var conversation = {"members": [username, savedUsernames[index]], "messageList": []};
					conversations.push(conversation);
					allConversations.push(conversation)
				}
			}
			conversations.push({"members": [username, "No Conversation Selected"], "messageList": [{type: 'text', author: "NotSelected", data: { text: "Please go to friends list and select a friend to chat with!"} }]});
			console.log(allConversations);
		}

		usernames[username] = socket;
    for (var index in conversations) {
        var conversation = conversations[index];
        for (var listIndex in conversation.messageList) {
            var message = conversation.messageList[listIndex];
            if (message.author == username) {
                message.author = "me";
            } else {
                message.author = "them";
            }
        }
    }
    console.log(conversations);
    socket.emit("allConvos", conversations);
  });
}

function handleMessageUsertoUser(socket) {
  socket.on('chatMessage', function(messageInfo) {
    updateOneToOneConversation(messageInfo.to, messageInfo.from, messageInfo.messageList);
    console.log('CHATMESSAGE EVENT')
    console.log(messageInfo.messageList);
    console.log("-----------------------------------------------")

    var newMessageInfo = JSON.parse(JSON.stringify(messageInfo));
    for (var index in newMessageInfo.messageList) {
      var message = newMessageInfo.messageList[index];
      if (message.author == messageInfo.to) {
          message.author = "me";
      } else {
          message.author = "them";
      }
    }

    console.log(newMessageInfo.messageList);

    if (usernames[messageInfo.to] !== undefined) {
      console.log("SENDING MESSAGE TO " + newMessageInfo.to);
      usernames[messageInfo.to].emit('newMessage', newMessageInfo);
    }
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
        for (var index in messageList) {
            var message = messageList[index];
            if (message.author == "me") {
                message.author = from;
            } else {
                message.author = to;
            }
        }
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
