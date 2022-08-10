'use strict';

const express = require('express');
var cors = require('cors')
const bodyParser = require("body-parser");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
const { InMemorySessionStore } = require("./clazz/sessionStore");
const sessionStore = new InMemorySessionStore();
const {ServerUtils} = require("./utils/utils");
const serverUtils = new ServerUtils();

const {MessageUtils} = require("./utils/messageUtils");
const messageUtils = new MessageUtils();


const mongoose = require("mongoose");
const MessagesCollection = require("./models/messages");
const UsersCollection = require("./models/users");
const UserManagement = require('./utils/userManagement');

const PORT = process.env.PORT || 3111;
const clientURL = 'http://127.0.0.1:8887'; 
// const clientURL = "https://pwa-dev.psi-connect.org";
const INDEX = '/index.html';
let socketList = [];

// =======================================================================================================
// Mongo Connection
// ====================


const mongoDB = "mongodb+srv://tranchau:Test1234@cluster0.n0jz7.mongodb.net/chatApp?retryWrites=true&w=majority";

mongoose.connect(mongoDB).then(() => {
	console.log("============================= mongo connected ");
}).catch(err => console.log(err))


// ====================
// Mongo Connection
// =======================================================================================================


const server = express()
.use(cors())
.use(bodyParser.urlencoded({ extended: false }))
.use(bodyParser.json())
.get('/', (req, res) => {
	res.send('Chat server started !!!');
})
.get("/users", (req, res) => {
	const username = req.query.username;
	try {
		UsersCollection.find({username: username}).then(( list ) => {
			if( list.length > 0 )
			{
				const curUser = list[0];
				let contactNameList = curUser.contacts.map(contact => contact.contactName);
	
				UsersCollection.find({username: {$in: contactNameList }})
				.then(( contactList ) => {
					MessagesCollection.find().or([
						{ sender: username },
						{ receiver: username }
					])
					.sort({ datetime: -1 })
					.then(( messageList ) => {
						
						let contactUserList = [];
						for( var i=0; i<messageList.length; i++ )
						{ 
							const contactName = ( messageList[i].sender !== username ) ? messageList[i].sender : messageList[i].receiver;
							const found = serverUtils.findItemFromList( contactUserList, contactName, "username" );
							if(!found) 
							{
								contactUserList.push( serverUtils.findItemFromList(contactList, contactName, "username") );
							}
						}

						// Add the contactData for contacts without any messages
						for( var i=0; i<contactList.length; i++ )
						{ 
							const contactData = contactList[i];
							const found = serverUtils.findItemFromList( contactUserList, contactData.username, "username" );
							if(!found) 
							{
								contactUserList.push( contactData );
							}
						}
						
						res.send({status: "SUCCESS", curUser: curUser, contacts: contactUserList});
					})
				}).catch( ex )
				{
					res.send({status: "ERROR", msg: ex.message});
					console.log(`============================= GET /users/${username} throws error. ` + ex.message);
				}
			}
			else
			{
				const curUser = {
					username: username,
					contacts: [],
					fullName: username
				}
				const user = new UsersCollection( curUser );
				user.save().then(() => {
					res.send({status: "SUCCESS", curUser: curUser, contacts: []});
				}).catch( ex )
				{
					res.send({status: "ERROR", msg: `Couldn't create user with username ${username}.` + ex.message});
					console.log(`============================= GET /users/${username} throws error. Couldn't create user with username ${username}.` + ex.message);
				}
			}
		});
	}
	catch( ex )
	{
		res.send({status: "ERROR", msg: ex.message});
		console.log(`============================= GET /users/${username} throws error. ` + ex.message);
	}
	
})
.post("/users", (req, res) => {
	const username1 = req.body.username1;
	const username2 = req.body.username2;

	try
	{
		const userManagement = new UserManagement();
		userManagement.createIfNotExist(  username1, username2, function(){
			res.send({msg: `The user is created.`, "status": "SUCCESS"});
		})
	}
	catch( ex )
	{
		res.send({msg: `The users ${username1} and ${username2} couldn't be created. ${ex.message}`, "status": "ERROR"});
		console.log(`============================= POST /users - The users ${username1} and ${username2} couldn't be created. ${ex.message}`);
	}
	
})
.get("/messages", (req, res) => {
	const username1 = req.query.username1;
	const username2 = req.query.username2;

	if( username1 == undefined || username2 == undefined )
	{
		res.send( {status: "ERROR", msg: "Missing parameters 'username1' and 'username2'"} );
	}
	else
	{
		MessagesCollection.find().or([
			{ sender: username1, receiver: username2 },
			{ sender: username2, receiver: username1 }
		])
		.sort({ datetime: 1 })
		.then(( result ) => {
			res.send( result );
		})
	}
})
.post('/messages', function(req, res){
	
	console.log("============================= Send data from POST request : ");

	try
	{
		const data = req.body;

		const userManagement = new UserManagement();
		userManagement.createWtsaUserIfNotExist( data.sender, data.receiver, function(userList){
			// Save message to mongodb
			let msg = data.msg;
			let filetype;
			if( data.incomingPayload.MediaUrl0 != undefined ) {
				msg = data.incomingPayload.MediaUrl0;
				filetype = "IMAGE";
			}
			const messageData = {
				"datetime": data.datetime,
				"msg": msg,
				"sender": data.sender.id,
				"receiver": data.receiver.id,
				"msgtype": data.msgtype,
				filetype
			}
			
			const message = new MessagesCollection( messageData );
			message.save().then(() => {
				const to = messageData.receiver;
				if(socketList.hasOwnProperty(to)){
					socketList[to].emit( 'sendMsg', messageData );

					// ---------------------------------------------------
					// Check new contact
					var userInfo0 = userList[0];
					var userInfo1 = userList[1];

					if(socketList.hasOwnProperty(userInfo0)){
						socketList[userInfo0].emit( 'receive_message', {userData: userInfo0, newContact: userInfo1} );
					}

					if(socketList.hasOwnProperty(userInfo1)){
						socketList[userInfo1].emit( 'receive_message', {userData: userInfo1, newContact: userInfo0} );
					}
				}
				res.send({msg:"Data is sent.", "status": "SUCCESS"});
				console.log("--- Data is sent successfully.");
			}).catch( ex )
			{
				res.send({ status: "ERROR", msg: ex.message });
				console.log("--- ERROR ( while sending message ) " + ex.message );
			};
		})
	}
	catch( ex )
	{
		res.send({ status: "ERROR", msg: ex.message });
		console.log("--- ERROR ( while sending message ) " + ex.message );
	}
})
.listen(PORT, () => console.log(`Listening on ${PORT}`));


// =======================================================================================================
// INIT Socket IO
// ====================

const io = require('socket.io')(server,{
  cors: {
		origin: clientURL,
		// origin: [ clientURL, clientURL_loc ],
		methods: ["GET", "POST"],
		credentials: true
	}
});

io.use( async(socket, next) => {

	try {
		/** Create two random values:
				1. a session ID, private, which will be used to authenticate the user upon reconnection
				2. a user ID, public, which will be used as an identifier to exchange messages
		*/
		const sessionID = socket.handshake.auth.sessionID;
		if (sessionID) {
			// find existing session
			const session = await sessionStore.findSession(sessionID);
			if (session) {
				socket.sessionID = sessionID;
				socket.userID = session.userID;
				socket.username = session.username;
				return next();
			}
		}
		
		const username = socket.handshake.auth.username;
		if (!username) {
			return next(new Error("invalid username."));
		}

		// create new session
		socket.sessionID = randomId();
		socket.userID = randomId();
		socket.username = username;

	}
	catch( e)
	{
		console.log(e);
	}

	next();
})



// =======================================================================================================
// Create connection
// ====================

io.on('connection', socket => {

	// persist session
	sessionStore.saveSession(socket.sessionID, {
		userID: socket.userID,
		username: socket.username,
		connected: true,
	});

  	// emit session details
	socket.emit("session", {
		sessionID: socket.sessionID,
		userID: socket.userID,
		username: socket.username,
	});

	// join the "userID" room
	socket.join(socket.userID);

	console.log( "--- connect to  sessionID : " + socket.sessionID + " ------ userID : " + socket.userID + " ------- username: " + socket.username );
	socketList[socket.username] = socket;

	// fetch existing users
	const users = sessionStore.getAllUsers();
	socket.emit("users", users);
	
	
	// notify existing users
	socket.broadcast.emit("user_connected", {
		userID: socket.userID,
		username: socket.username,
		connected: true,
	});
	
	
	// forward the private message to the right recipient (and to other tabs of the sender)
	socket.on("private_message", (data) => {
		
		const message = new MessagesCollection( data );
		// Save message to mongodb
		message.save().then(() => {

			// Send message to Whatsapp
			messageUtils.sendWtsaMessage( data.sender, data.receiver, data.msg );

			// Send to message
			const users = sessionStore.getAllUsers();
			const to = serverUtils.findItemFromList( users, data.receiver, "username");
			if( to != undefined )
			{
				socket.to(to.userID).to(socket.userID).emit("sendMsg", data );
			}
			else
			{
				socket.to(socket.userID).emit("sendMsg", data );
			}
		})

	});

	socket.on("has_new_message", ({userData, contactName, hasNewMessages}) => {
		for( var i=0; i< userData.contacts.length; i++ )
		{
			if( userData.contacts[i].contactName == contactName )
			{
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
		UsersCollection.find({username: userData.username}).then(( list ) => {
			if( list.length > 0 )
			{
				var userInfo = list[0];
				for( var i=0; i< userInfo.contacts.length; i++ )
				{
					if( userInfo.contacts[i].contactName == contactName )
					{
						userInfo.contacts[i].hasNewMessages = hasNewMessages;
						break;
					}
				}

				UsersCollection.find({username: contactName}).then(( contactData ) => {
					// Update User to mongodb
					UsersCollection.updateOne({username: userInfo.username}, { contacts: userInfo.contacts }).then((res) => {
						const to = userInfo.username;
						if(socketList.hasOwnProperty(to)){
							socketList[to].emit( 'receive_message', {userData: userInfo, newContact: contactData[0]} );
						}
					})
				})

			}
		});
		
	});

	socket.on("disconnect", async () => {  
		const matchingSockets = await io.in(socket.userID).allSockets();
		const isDisconnected = matchingSockets.size === 0;
		if (isDisconnected) {
			// notify other users
			socket.broadcast.emit("user_disconnected", socket.username);
			// update the connection status of the session
			sessionStore.saveSession(socket.sessionID, {
				userID: socket.userID,
				username: socket.username,
				connected: false,
			});
		}
	});

	socket.on('get_message_list', ( users ) => {
		MessagesCollection.find().or([
			{ sender: users.username1, receiver: users.username2 },
			{ sender: users.username2, receiver: users.username1 }
		])
		.sort({ datetime: 1 })
		.then(( result ) => {
			socket.emit('message_list', { messages: result, users: users } );
		})
	});

	
	socket.on('create_new_user', ( data ) => {
		const userManagement = new UserManagement();
		userManagement.createIfNotExist( data.username1, data.username2, function(userList){
			if(socketList.hasOwnProperty(data.username2)){
				const found = serverUtils.findItemFromList( userList, data.username1, "username" );
				socketList[data.username2].emit('new_user_created', found);
			}

			if(socketList.hasOwnProperty(data.username1)){
				const found = serverUtils.findItemFromList( userList, data.username2, "username" );
				socketList[data.username1].emit('new_user_created', found);
			}
		})
	});

	
	socket.on('remove_contact', ( {userData, contactName} ) => {

		serverUtils.removeFromList( userData.contacts, contactName, "contactName");

		// // Update User to mongodb
		const contacts = serverUtils.removeFromList( userData.contacts, contactName, "contactName");
		UsersCollection.updateOne({username: userData.username}, { contacts }).then((res) => {
			const to = userData.username;
			if(socketList.hasOwnProperty(to)){
				socketList[userData.username].emit( 'contact_removed', contactName);
			}
		})

	});

});
