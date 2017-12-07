var socketio = require('socket.io')
var io
var guestNumber = 1
var nickNames = {}
var usernames = {}
var currentRoom = {}
var savedUsernames = ['jacksonmeister', 'logangster', 'kelpaso']
var oneOnOnes
var allConversations = [{'members': ['jacksonmeister', 'logangster'],
  'messageList': [{type: 'text', author: 'jacksonmeister', data: { text: 'Hey Logan!'} },
                      {type: 'text', author: 'logangster', data: { text: "What's up jackson??"} },
                      {type: 'text', author: 'jacksonmeister', data: { text: 'Just working on Senior Proj.'} }]
},
  {'members': ['jacksonmeister', 'kelpaso'],
    			'messageList': [{type: 'text', author: 'jacksonmeister', data: { text: 'Dude are you ready to play MLP?'} },
                          {type: 'text', author: 'kelpaso', data: { text: "I'm excited! Brony for life!"} },
                          {type: 'text', author: 'jacksonmeister', data: { text: 'Settle down Kelsey.'} }]
  },
  {'members': ['kelpaso', 'logangster'],
        			'messageList': [{type: 'text', author: 'kelpaso', data: { text: 'Hey Logan!'} },
                              {type: 'text', author: 'logangster', data: { text: "Not now, I'm a little busy"} },
                              {type: 'text', author: 'kelpaso', data: { text: 'Wow, jerk.'} }]
  },

  {'members': ['weetermachine', 'logangster'],
    'messageList': []
  },
  {'members': ['weetermachine', 'kelpaso'],
    'messageList': []
  },
  {'members': ['weetermachine', 'jacksonmeister'],
    'messageList': []
  }]

exports.listen = function (server) {
  io = socketio.listen(server)
  io.set('log level', 1)
  io.sockets.on('connection', function (socket) {
    handleMessageBroadcasting(socket, nickNames)
    handleNameChangeAttempts(socket, nickNames)
    handleRoomJoining(socket)
    loadConversations(socket)
    handleMessageUsertoUser(socket)
    socket.on('rooms', function () {
      socket.emit('rooms', io.sockets.manager.rooms)
    })
    handleClientDisconnection(socket, nickNames)
  })
}

function loadConversations (socket) {
  socket.on('loadConversations', function (username) {
    console.log('LOADCONVERSATIONS: ' + username)
    var conversations = JSON.parse(JSON.stringify(findConversationsForUser(username)))

    if (conversations.length == 0) {
      if (Object.keys(usernames).length == 0) {
        for (var index in usernames) {
          var conversation = {'members': [username, usernames[index]], 'messageList': []}
          conversations.push(conversation)
          allConversations.push(conversation)
        }
      }
      for (var index in savedUsernames) {
        if (typeof usernames[savedUsernames[index]] === 'undefined') {
          var conversation = {'members': [username, savedUsernames[index]], 'messageList': []}
          conversations.push(conversation)
          allConversations.push(conversation)
        }
      }
      console.log(allConversations)
    }

    conversations.push({'members': [username, 'No Conversation Selected'], 'messageList': [{type: 'text', author: 'NotSelected', data: { text: 'Please go to friends list and select a friend to chat with!'} }]})
    usernames[username] = socket

    for (var index in conversations) {
      var conversation = conversations[index]
      for (var listIndex in conversation.messageList) {
        var message = conversation.messageList[listIndex]
        if (message.author == username) {
          message.author = 'me'
        } else {
          message.author = 'them'
        }
      }
    }
    socket.emit('allConvos', conversations)
  })
}

function handleMessageUsertoUser (socket) {
  socket.on('chatMessage', function (messageInfo) {
    updateOneToOneConversation(messageInfo.to, messageInfo.from, messageInfo.messageList)
    console.log('CHATMESSAGE EVENT')
    console.log(messageInfo.messageList)
    console.log('-----------------------------------------------')

    var newMessageInfo = JSON.parse(JSON.stringify(messageInfo))
    for (var index in newMessageInfo.messageList) {
      var message = newMessageInfo.messageList[index]
      if (message.author == messageInfo.to) {
        message.author = 'me'
      } else {
        message.author = 'them'
      }
    }

    console.log(newMessageInfo.messageList)

    if (usernames[messageInfo.to] !== undefined) {
      console.log('SENDING MESSAGE TO ' + newMessageInfo.to)
      usernames[messageInfo.to].emit('newMessage', newMessageInfo)
    }
  })
}

function findConversationsForUser (username) {
  var conversations = []
  for (var index in allConversations) {
    var conversation = allConversations[index]
    if (conversation.members.indexOf(username) != -1) {
      conversations.push(conversation)
    }
  }
  return conversations
}

function updateOneToOneConversation (to, from, messageList) {
  for (var index in allConversations) {
    var conversation = allConversations[index]
    if (conversation.members.length == 2 && conversation.members.indexOf(to) != -1
      && conversation.members.indexOf(from) != -1) {
      for (var index in messageList) {
        var message = messageList[index]
        if (message.author == 'me') {
          message.author = from
        } else {
          message.author = to
        }
      }
      conversation.messageList = messageList
      return
    }
  }
}

function joinRoom (socket, room) {
  socket.join(room)
  currentRoom[socket.id] = room
  socket.emit('joinResult', {room: room})
  socket.broadcast.to(room).emit('systemMessage', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  })

  var usersInRoom = io.sockets.clients(room)
  var usersInRoomSummary = ''
  for (var index in usersInRoom) {
    var userSocketId = usersInRoom[index].id
    if (index > 0) {
      usersInRoomSummary += ','
    }
    usersInRoomSummary += nickNames[userSocketId]
    socket.emit('usersInRoomSummary', {text: usersInRoomSummary})
    socket.broadcast.to(room).emit('usersInRoomSummary', {text: usersInRoomSummary})
  }
}

/* function joinOneonOne(socket, userid) {
  room = 'OneOnOne-' + userid;
  socket.join(room);
  oneOnOnes[socket.id].push(room);
  socket.emit('joinResult', {room: room});
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients(room);
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (index > 0) {
        usersInRoomSummary += ', ';
      }
      usersInRoomSummary += nickNames[userSocketId];
      }
    }
    socket.emit('message', {text: usersInRoomSummary});
  }
} */

function handleNameChangeAttempts (socket, nickNames) {
  socket.on('nameAttempt', function (name) {
    nickNames[socket.id] = name
    socket.emit('nameResult', {
      success: true,
      name: name
    })
      /* socket.broadcast.to(currentRoom[socket.id]).emit('message', {
        text: previousName + ' is now known as ' + name + '.'
      }); */
  })
}

function handleMessageBroadcasting (socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: message.text,
      room: message.room,
      username: nickNames[socket.id]
    })
  })
}

function handleRoomJoining (socket) {
  socket.on('join', function (room) {
    socket.leave(currentRoom[socket.id])
    joinRoom(socket, room.newRoom)
  })
}

function handleClientDisconnection (socket) {
  socket.on('disconnect', function () {
    console.log('disconnected: ' + room)
    var room = currentRoom[socket.id]
    delete currentRoom[socket.id]
    socket.leave(room)

		//  If user belongs to a room other than undefined, send a message out to the room to inform
    if (room != undefined) {
      io.sockets.in(room).emit('systemMessage', {
        text: nickNames[socket.id] + ' has left ' + room + '.'
      })

      var usersInRoom = io.sockets.clients(room)
      var usersInRoomSummary = ''
			// Send out another usersInRoomSummary to update the chat lists
	    for (var index in usersInRoom) {
	      var userSocketId = usersInRoom[index].id
	      if (index > 0) {
	        usersInRoomSummary += ','
	      }
	      usersInRoomSummary += nickNames[userSocketId]
	    }
	    io.sockets.in(room).emit('usersInRoomSummary', {text: usersInRoomSummary})
	    delete nickNames[socket.id]
    }
  })
}
