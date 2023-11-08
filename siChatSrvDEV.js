'use strict';

const express = require('express');
var cors = require('cors');

var SocketIOFileUpload = require("socketio-file-upload");


const bodyParser = require("body-parser");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
const { InMemorySessionStore } = require("./clazz/sessionStore");
const sessionStore = new InMemorySessionStore();
const {ServerUtils} = require("./utils/utils");
const serverUtils = new ServerUtils();

const {MessageUtils} = require("./utils/messageUtils");
const messageUtils = new MessageUtils("https://api-dev.psi-connect.org/TTS.wtsaMsgSend");


const mongoose = require("mongoose");
const MessagesCollection = require("./models/messages");
const UsersCollection = require("./models/users");
const UserManagement = require('./utils/userManagement');

const PORT = process.env.PORT || 3111;
const clientURL = 'http://127.0.0.1:8887'; 
// const clientURL = "https://pwa-dev.psi-connect.org";
// const clientURL = "https://pwa-test.psi-connect.org";
const INDEX = '/index.html';
let socketList = [];

// =======================================================================================================
// Mongo Connection
// ====================


const mongoDB = "mongodb+srv://chatappuser:Test1234@clusterdev.uvudw.mongodb.net/dev?retryWrites=true&w=majority";

mongoose.connect(mongoDB).then(() => {
	console.log("============================= mongo connected ");
}).catch(err => console.log(err))


// ====================
// Mongo Connection
// =======================================================================================================


const server = express()
.use(SocketIOFileUpload.router)
.use(cors())
.use(bodyParser.urlencoded({ extended: false }))
.use(bodyParser.json())
.get('/', (req, res) => {
	res.send('Chat server started !!!');
})
.get('/uploads', (req, res) => {
    res.sendFile(__dirname + "/uploads/" + req.query.path);
})
.get("/users", (req, res) => {
	const username = req.query.username;
	try {
		UsersCollection.find({
			"$or": [
				{ "username": username },
				{ "contacts": { 
					"$elemMatch": { "contactName": username } 
				}},
			]
		}).then(( list ) => {
			if( list.length > 0 )
			{
				// Find "username" with full information
				const curUser = serverUtils.findItemFromList(list, username, "username" );

				// Remove the contactData if this contact has relationship with the "username", BUT "username" doesn't have relationship with this contactName
				let tempContactList = [];
				for( var i=0; i<list.length; i++ )
				{ 
					const contactData = list[i];
					if( contactData.username != username )
					{
						const found = serverUtils.findItemFromList( curUser.contacts, contactData.username, "contactName" );
						if( found ) 
						{
							tempContactList.push( contactData );
						}
					}
				}
				

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
							const contactData = serverUtils.findItemFromList(tempContactList, contactName, "username");
							if( contactData != undefined )
							{
								contactUserList.push( contactData );
							}
						}
					}

					// Add the contactData for contacts without any messages
					for( var i=0; i<tempContactList.length; i++ )
					{ 
						const contactData = tempContactList[i];
						const found = serverUtils.findItemFromList( contactUserList, contactData.username, "username" );
						if(!found ) 
						{
							contactUserList.push( contactData );
						}
					}

					res.send({status: "SUCCESS", curUser: curUser, contacts: contactUserList});
				})
			}
			else
			{
				const curUser = {
					username: username,
					contacts: [],
					fullName: username
				}

				const user = new UsersCollection( curUser );
				user.save(function (saveExp, product) {
					if (saveExp)
					{
						res.send({status: "ERROR", msg: `Couldn't create user with username ${username}.` + saveExp.message});
						console.log(`============================= GET /users/${username} throws error. Couldn't create user with username ${username}.` + saveExp.message);
					}
					else
					{
						res.send({status: "SUCCESS", curUser: curUser, contacts: []});
					}
				})
				
			}
		})
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

	const userList = [
		{
			username: username1,
			fullName: username1,
			contacts: [{
				contactName: username2,
				hasNewMessages: false
			}]
		},
		{
			username: username2,
			fullName: username2,
			contacts: [{
				contactName: username1,
				hasNewMessages: false
			}]
		}
	];

	try
	{
		const userManagement = new UserManagement();
		userManagement.createUserList(userList, function(responseUserList){
			let msg = "";
			var errorUsernameList = Object.keys(responseUserList.errorList);
			if( errorUsernameList.length > 0 )
			{
				msg += `ERROR while creating users ${errorUsernameList.join(", ")}. See details below : `;
				for( var username in responseUserList.errorList )
				{
					msg += username + ": " + responseUserList.errorList[username];
				}
				res.send({msg, "status": "ERROR"});
			}
			else
			{

				res.send({msg: `Users are created.`, "status": "SUCCESS"});
			}
		});
	}
	catch( ex )
	{
		res.send({msg: `The users ${username1} and ${username2} couldn't be created. ${ex.message}`, "status": "ERROR"});
		console.log(`============================= POST /users - The users ${username1} and ${username2} couldn't be created. ${ex.message}`);
	}
	
})
.post("/userList", (req, res) => {
	
	// req.body ==>  contactUser: {username, Wtsa, fullName, ...}, userInfo: {username, Wtsa, fullName, ...}  }

	// req.body ==>  [ {username, Wtsa, fullName, ...}, userInfo: {username, Wtsa, fullName, ...}, ... ]

	if( req.body.length < 0)
	{
		res.send({msg: `The payload structure is wrong.`, "status": "ERROR"});
	}
	else
	{
		const data = req.body;
		// const username1 = req.body.contactUser.username;
		// const username2 = req.body.userInfo.username;

		try
		{
			const userManagement = new UserManagement();
			userManagement.createUserList(data, function(responseUserList){
				let msg = "";
				var errorUsernameList = Object.keys(responseUserList.errorList);
				if( errorUsernameList.length > 0 )
				{
					msg += `ERROR while creating users ${errorUsernameList.join(", ")}. See details below : `;
					for( var username in responseUserList.errorList )
					{
						msg += username + ": " + responseUserList.errorList[username];
					}
					res.send({msg, "status": "ERROR"});
				}
				else
				{

					res.send({msg: `Users are created.`, "status": "SUCCESS"});
				}
			})
		}
		catch( ex )
		{
			var usernameList = data.map(function(item){return item.username }).join(", ");
			res.send({msg: `The users ${usernameList} couldn't be created. ${ex.message}`, "status": "ERROR"});
			console.log(`============================= POST /users - The users ${usernameList} couldn't be created. ${ex.message}`);
		}
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
		userManagement.createWtsaUserIfNotExist( data.sender, data.receiver, function(responseData){
			
			if( Object.keys(responseData.errorList).length == 0)
			{
				// Save message to mongodb
				let msg = data.msg;
				let filetype;
				let name;
				if( data.incomingPayload != undefined && data.incomingPayload.MediaUrl0 != undefined ) {
					msg = data.incomingPayload.MediaUrl0;
					name = msg;
					filetype = "IMAGE";
				}
				const messageData = {
					"datetime": data.datetime,
					"msg": msg,
					"sender": data.sender.id,
					"receiver": data.receiver.id,
					"msgtype": data.msgtype,
					filetype,
					name
				}
				
				const message = new MessagesCollection( messageData );
				message.save().then(() => {
					
					const to = messageData.receiver;
					if(socketList.hasOwnProperty(to)){
						socketList[to].emit( 'sendMsg', messageData );
					};

					
					const from = messageData.sender;
					if(socketList.hasOwnProperty(from)){
						socketList[from].emit( 'sendMsg', messageData );
					};
					
					res.send({msg:"Data is sent.", "status": "SUCCESS"});
					console.log("--- Data is sent successfully.");
				});
			}
			else
			{
				res.send(responseData);
				console.log("--- Users are created failed." + responseData.msg);
			}
		})
	}
	catch( createExp )
	{
		res.send({ status: "ERROR", msg: createExp.message });
		console.log("--- ERROR ( while sending message ) " + createExp.message );
	}
})
.listen(PORT, () => console.log(`Listening on ${PORT}, Client URL : ${clientURL}` ));


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


	// --------------------------------------------------------------------------------------------------------------
	// Upload file

	// Make an instance of SocketIOFileUpload and listen on this socket:
	var uploader = new SocketIOFileUpload();
	uploader.dir = "uploads";
	uploader.listen(socket);

	// Do something when a file is saved:
	uploader.on("saved", function (event) {
		// console.log(event);

		const filePath = event.file.name.split(".");
		event.file.clientDetail.name = event.file.base + "." + filePath[filePath.length - 1]; 
	});

	// Error handler:
	uploader.on("error", function (event) {
		console.log("Error from uploader", event);
	});


	// --------------------------------------------------------------------------------------------------------------
	// Socket connection

	
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
			messageUtils.sendWtsaMessage( data.sender, data.receiver, data.msg, data.filetype, data.name );

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

	
	socket.on('create_new_user', ( userList ) => {
		const userManagement = new UserManagement();
		// successList": me.successList, "errorList

		userManagement.createUserList( userList, function(responseData){
			var savedUserList = Object.values( responseData.successList );
			for( let i=-0; i<savedUserList.length; i++ )
			{
				let username = savedUserList[i].username;
				if(socketList.hasOwnProperty(username)){
					socketList[username].emit('new_user_created', savedUserList);
				}
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
