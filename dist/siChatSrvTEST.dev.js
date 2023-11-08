'use strict';

var express = require('express');

var cors = require('cors');

var SocketIOFileUpload = require("socketio-file-upload");

var fs = require('fs');

var _require = require("fs"),
    writeFile = _require.writeFile;

var bodyParser = require("body-parser");

var crypto = require("crypto");

var randomId = function randomId() {
  return crypto.randomBytes(8).toString("hex");
};

var _require2 = require("./clazz/sessionStore"),
    InMemorySessionStore = _require2.InMemorySessionStore;

var sessionStore = new InMemorySessionStore();

var _require3 = require("./utils/utils"),
    ServerUtils = _require3.ServerUtils;

var serverUtils = new ServerUtils();

var _require4 = require("./utils/messageUtils"),
    MessageUtils = _require4.MessageUtils;

var messageUtils = new MessageUtils("https://api-test.psi-connect.org/TTS.wtsaMsgSend");

var mongoose = require("mongoose");

var MessagesCollection = require("./models/messages");

var UsersCollection = require("./models/users");

var UserManagement = require('./utils/userManagement');

var PORT = process.env.PORT || 3112; // const clientURL = 'http://127.0.0.1:8887'; 
// const clientURL = "https://pwa-dev.psi-connect.org";

var clientURL = "https://pwa-test.psi-connect.org";
var INDEX = '/index.html';
var socketList = []; // =======================================================================================================
// Mongo Connection
// ====================

var mongoDB = "mongodb+srv://chatappuser:Test1234@clusterdev.uvudw.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(mongoDB).then(function () {
  console.log("============================= mongo connected ");
})["catch"](function (err) {
  return console.log(err);
}); // ====================
// Mongo Connection
// =======================================================================================================

var server = express().use(SocketIOFileUpload.router).use(cors()).use(bodyParser.urlencoded({
  extended: false
})).use(bodyParser.json()).get('/', function (req, res) {
  res.send('Chat server started !!!');
}).get('/uploads', function (req, res) {
  res.sendFile(__dirname + "/uploads/" + req.query.path);
}).get("/users", function (req, res) {
  var username = req.query.username;

  try {
    UsersCollection.find({
      "$or": [{
        "username": username
      }, {
        "contacts": {
          "$elemMatch": {
            "contactName": username
          }
        }
      }]
    }).then(function (list) {
      if (list.length > 0) {
        // Find "username" with full information
        var curUser = serverUtils.findItemFromList(list, username, "username"); // Remove the contactData if this contact has relationship with the "username", BUT "username" doesn't have relationship with this contactName

        var tempContactList = [];

        for (var i = 0; i < list.length; i++) {
          var contactData = list[i];

          if (contactData.username != username) {
            var found = serverUtils.findItemFromList(curUser.contacts, contactData.username, "contactName");

            if (found) {
              tempContactList.push(contactData);
            }
          }
        }

        MessagesCollection.find().or([{
          sender: username
        }, {
          receiver: username
        }]).sort({
          datetime: -1
        }).then(function (messageList) {
          var contactUserList = [];

          for (var i = 0; i < messageList.length; i++) {
            var contactName = messageList[i].sender !== username ? messageList[i].sender : messageList[i].receiver;

            var _found = serverUtils.findItemFromList(contactUserList, contactName, "username");

            if (!_found) {
              var _contactData = serverUtils.findItemFromList(tempContactList, contactName, "username");

              if (_contactData != undefined) {
                contactUserList.push(_contactData);
              }
            }
          } // Add the contactData for contacts without any messages


          for (var i = 0; i < tempContactList.length; i++) {
            var _contactData2 = tempContactList[i];

            var _found2 = serverUtils.findItemFromList(contactUserList, _contactData2.username, "username");

            if (!_found2) {
              contactUserList.push(_contactData2);
            }
          }

          res.send({
            status: "SUCCESS",
            curUser: curUser,
            contacts: contactUserList
          });
        });
      } else {
        var _curUser = {
          username: username,
          contacts: [],
          fullName: username
        };
        var user = new UsersCollection(_curUser); // user.save().then(() => {
        // 	res.send({status: "SUCCESS", curUser: curUser, contacts: []});
        // }).catch( saveExp )
        // {
        // 	console.log(saveExp);
        // 	res.send({status: "ERROR", msg: `Couldn't create user with username ${username}.` + saveExp.message});
        // 	console.log(`============================= GET /users/${username} throws error. Couldn't create user with username ${username}.` + saveExp.message);
        // }

        user.save(function (saveExp, product) {
          if (saveExp) {
            console.log(saveExp);
            res.send({
              status: "ERROR",
              msg: "Couldn't create user with username ".concat(username, ".") + saveExp.message
            });
            console.log("============================= GET /users/".concat(username, " throws error. Couldn't create user with username ").concat(username, ".") + saveExp.message);
          } else {
            res.send({
              status: "SUCCESS",
              curUser: _curUser,
              contacts: []
            });
          }
        });
      }
    });
  } catch (ex) {
    res.send({
      status: "ERROR",
      msg: ex.message
    });
    console.log("============================= GET /users/".concat(username, " throws error. ") + ex.message);
  }
}).post("/users", function (req, res) {
  var username1 = req.body.username1;
  var username2 = req.body.username2;

  try {
    var userManagement = new UserManagement();
    userManagement.createUserList(username1, username2, function () {
      res.send({
        msg: "The user is created.",
        "status": "SUCCESS"
      });
    });
  } catch (ex) {
    res.send({
      msg: "The users ".concat(username1, " and ").concat(username2, " couldn't be created. ").concat(ex.message),
      "status": "ERROR"
    });
    console.log("============================= POST /users - The users ".concat(username1, " and ").concat(username2, " couldn't be created. ").concat(ex.message));
  }
}).get("/messages", function (req, res) {
  var username1 = req.query.username1;
  var username2 = req.query.username2;

  if (username1 == undefined || username2 == undefined) {
    res.send({
      status: "ERROR",
      msg: "Missing parameters 'username1' and 'username2'"
    });
  } else {
    MessagesCollection.find().or([{
      sender: username1,
      receiver: username2
    }, {
      sender: username2,
      receiver: username1
    }]).sort({
      datetime: 1
    }).then(function (result) {
      res.send(result);
    });
  }
}).post('/messages', function (req, res) {
  console.log("============================= Send data from POST request : ");

  try {
    var data = req.body;
    var userManagement = new UserManagement();
    userManagement.createWtsaUserIfNotExist(data.sender, data.receiver, function (userList) {
      // Save message to mongodb
      var msg = data.msg;
      var filetype;
      var name;

      if (data.incomingPayload.MediaUrl0 != undefined) {
        msg = data.incomingPayload.MediaUrl0;
        name = msg;
        filetype = "IMAGE";
      }

      var messageData = {
        "datetime": data.datetime,
        "msg": msg,
        "sender": data.sender.id,
        "receiver": data.receiver.id,
        "msgtype": data.msgtype,
        filetype: filetype,
        name: name
      };
      var message = new MessagesCollection(messageData);
      message.save().then(function () {
        var to = messageData.receiver;

        if (socketList.hasOwnProperty(to)) {
          socketList[to].emit('sendMsg', messageData); // ---------------------------------------------------
          // Check new contact

          var userInfo0 = userList[0];
          var userInfo1 = userList[1];

          if (socketList.hasOwnProperty(userInfo0)) {
            socketList[userInfo0].emit('receive_message', {
              userData: userInfo0,
              newContact: userInfo1
            });
          }

          if (socketList.hasOwnProperty(userInfo1)) {
            socketList[userInfo1].emit('receive_message', {
              userData: userInfo1,
              newContact: userInfo0
            });
          }
        }

        res.send({
          msg: "Data is sent.",
          "status": "SUCCESS"
        });
        console.log("--- Data is sent successfully.");
      }); // .catch( saveExp )
      // {
      // 	res.send({ status: "ERROR", msg: saveExp.message });
      // 	console.log("--- ERROR ( while sending message ) " + saveExp.message );
      // };
    });
  } catch (createExp) {
    res.send({
      status: "ERROR",
      msg: createExp.message
    });
    console.log("--- ERROR ( while sending message ) " + createExp.message);
  }
}).listen(PORT, function () {
  return console.log("Listening on ".concat(PORT));
}); // =======================================================================================================
// INIT Socket IO
// ====================

var io = require('socket.io')(server, {
  cors: {
    origin: clientURL,
    // origin: [ clientURL, clientURL_loc ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.use(function _callee(socket, next) {
  var sessionID, session, username;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;

          /** Create two random values:
          		1. a session ID, private, which will be used to authenticate the user upon reconnection
          		2. a user ID, public, which will be used as an identifier to exchange messages
          */
          sessionID = socket.handshake.auth.sessionID;

          if (!sessionID) {
            _context.next = 11;
            break;
          }

          _context.next = 5;
          return regeneratorRuntime.awrap(sessionStore.findSession(sessionID));

        case 5:
          session = _context.sent;

          if (!session) {
            _context.next = 11;
            break;
          }

          socket.sessionID = sessionID;
          socket.userID = session.userID;
          socket.username = session.username;
          return _context.abrupt("return", next());

        case 11:
          username = socket.handshake.auth.username;

          if (username) {
            _context.next = 14;
            break;
          }

          return _context.abrupt("return", next(new Error("invalid username.")));

        case 14:
          // create new session
          socket.sessionID = randomId();
          socket.userID = randomId();
          socket.username = username;
          _context.next = 22;
          break;

        case 19:
          _context.prev = 19;
          _context.t0 = _context["catch"](0);
          console.log(_context.t0);

        case 22:
          next();

        case 23:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 19]]);
}); // =======================================================================================================
// Create connection
// ====================

io.on('connection', function (socket) {
  // --------------------------------------------------------------------------------------------------------------
  // Upload file
  // Make an instance of SocketIOFileUpload and listen on this socket:
  var uploader = new SocketIOFileUpload();
  uploader.dir = "uploads";
  uploader.listen(socket); // Do something when a file is saved:

  uploader.on("saved", function (event) {
    // console.log(event);
    var filePath = event.file.name.split(".");
    event.file.clientDetail.name = event.file.base + "." + filePath[filePath.length - 1];
  }); // Error handler:

  uploader.on("error", function (event) {
    console.log("Error from uploader", event);
  }); // --------------------------------------------------------------------------------------------------------------
  // Socket connection
  // persist session

  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true
  }); // emit session details

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username
  }); // join the "userID" room

  socket.join(socket.userID);
  console.log("--- connect to  sessionID : " + socket.sessionID + " ------ userID : " + socket.userID + " ------- username: " + socket.username);
  socketList[socket.username] = socket; // fetch existing users

  var users = sessionStore.getAllUsers();
  socket.emit("users", users); // notify existing users

  socket.broadcast.emit("user_connected", {
    userID: socket.userID,
    username: socket.username,
    connected: true
  }); // forward the private message to the right recipient (and to other tabs of the sender)

  socket.on("private_message", function (data) {
    var message = new MessagesCollection(data); // Save message to mongodb

    message.save().then(function () {
      // Send message to Whatsapp
      messageUtils.sendWtsaMessage(data.sender, data.receiver, data.msg, data.filetype, data.name); // Send to message

      var users = sessionStore.getAllUsers();
      var to = serverUtils.findItemFromList(users, data.receiver, "username");

      if (to != undefined) {
        socket.to(to.userID).to(socket.userID).emit("sendMsg", data);
      } else {
        socket.to(socket.userID).emit("sendMsg", data);
      }
    });
  });
  socket.on("has_new_message", function (_ref) {
    var userData = _ref.userData,
        contactName = _ref.contactName,
        hasNewMessages = _ref.hasNewMessages;

    for (var i = 0; i < userData.contacts.length; i++) {
      if (userData.contacts[i].contactName == contactName) {
        userData.contacts[i].hasNewMessages = hasNewMessages;
        break;
      }
    }
    /*** Update User to mongodb - Need to search and get userData again 
     * in case this "has_new_message" is called from API "/messages"
     * and a new user is created and need to update relationship for another user.
     * 
     * We are trying to not override the new reltionship if it is created for an existing user.
     * 
     * TODO: for param "userData" ==> Just need to use "username" is good enough.
    */


    UsersCollection.find({
      username: userData.username
    }).then(function (list) {
      if (list.length > 0) {
        var userInfo = list[0];

        for (var i = 0; i < userInfo.contacts.length; i++) {
          if (userInfo.contacts[i].contactName == contactName) {
            userInfo.contacts[i].hasNewMessages = hasNewMessages;
            break;
          }
        }

        UsersCollection.find({
          username: contactName
        }).then(function (contactData) {
          // Update User to mongodb
          UsersCollection.updateOne({
            username: userInfo.username
          }, {
            contacts: userInfo.contacts
          }).then(function (res) {
            var to = userInfo.username;

            if (socketList.hasOwnProperty(to)) {
              socketList[to].emit('receive_message', {
                userData: userInfo,
                newContact: contactData[0]
              });
            }
          });
        });
      }
    });
  });
  socket.on("disconnect", function _callee2() {
    var matchingSockets, isDisconnected;
    return regeneratorRuntime.async(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return regeneratorRuntime.awrap(io["in"](socket.userID).allSockets());

          case 2:
            matchingSockets = _context2.sent;
            isDisconnected = matchingSockets.size === 0;

            if (isDisconnected) {
              // notify other users
              socket.broadcast.emit("user_disconnected", socket.username); // update the connection status of the session

              sessionStore.saveSession(socket.sessionID, {
                userID: socket.userID,
                username: socket.username,
                connected: false
              });
            }

          case 5:
          case "end":
            return _context2.stop();
        }
      }
    });
  });
  socket.on('get_message_list', function (users) {
    MessagesCollection.find().or([{
      sender: users.username1,
      receiver: users.username2
    }, {
      sender: users.username2,
      receiver: users.username1
    }]).sort({
      datetime: 1
    }).then(function (result) {
      socket.emit('message_list', {
        messages: result,
        users: users
      });
    });
  });
  socket.on('create_new_user', function (data) {
    var userManagement = new UserManagement();
    userManagement.createUserList(data.username1, data.username2, function (userList) {
      if (socketList.hasOwnProperty(data.username2)) {
        var found = serverUtils.findItemFromList(userList, data.username1, "username");
        socketList[data.username2].emit('new_user_created', found);
      }

      if (socketList.hasOwnProperty(data.username1)) {
        var _found3 = serverUtils.findItemFromList(userList, data.username2, "username");

        socketList[data.username1].emit('new_user_created', _found3);
      }
    });
  });
  socket.on('remove_contact', function (_ref2) {
    var userData = _ref2.userData,
        contactName = _ref2.contactName;
    serverUtils.removeFromList(userData.contacts, contactName, "contactName"); // // Update User to mongodb

    var contacts = serverUtils.removeFromList(userData.contacts, contactName, "contactName");
    UsersCollection.updateOne({
      username: userData.username
    }, {
      contacts: contacts
    }).then(function (res) {
      var to = userData.username;

      if (socketList.hasOwnProperty(to)) {
        socketList[userData.username].emit('contact_removed', contactName);
      }
    });
  });
});