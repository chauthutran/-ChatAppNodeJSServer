

const UsersCollection = require("../models/users");
const {ServerUtils} = require("./utils");
const serverUtils = new ServerUtils();

const UserManagement = class {
	constructor() {
	}

	/**
	 * 
	 * @param data { contactUser: {username, Wtsa, fullName, ...}, userInfo: {username, Wtsa, fullName, ...}  }
	 */
	createUserList( data, exeFunc ) {
		var me = this;

		// var usernameList = userList.map(function(user){ return { username: user.username}; });
		UsersCollection.find().or([
			{ username: data.userInfo.username },
			{ username: data.contactUser.username }
		]).then(( list ) => {
			if( list.length == 1 )
			{
				if( list[0].username == data.contactUser.username ) // contactUser existed, create userInfo
				{
					me.createNewUserWithContactUser(data.userInfo, list[0], exeFunc );
				}
				else if( list[0].username == username2 ) // userInfo existed, create contactUser
				{
					me.createNewUserWithContactUser(data.contactUser, list[0], exeFunc );
				}
			}
			else if( list.length == 0 ) // Need to create userInfo and contactUser
			{
				// Create userInfo with relationship with contactUser
				me.createNewUserAndContactUser( data.userInfo, data.contactUser, exeFunc );
			}
			else if( list.length == 2 ) // userInfo and contactUser existed, Need to update the contact list 
			{
				me.updateContactList( list[0], list[1], exeFunc );
			}
		});
	};

	
	createWtsaUserIfNotExist( sender, receiver, exeFunc ) {
		const username1 = sender.id;
		const username2 = receiver.id;

		UsersCollection.find().or([
			{ username: username1 },
			{ username: username2 }
		]).then(( list ) => {

			var me = this;

			// For Receiver data
			const receiverFullName = ( receiver.name ? receiver.name : receiver.phone );
			const userData2 = {
				username: username2,
				wtsa: receiver.phone,
				fullName: receiverFullName,
				contacts: [{
					contactName: username1,
					hasNewMessages: false
				}]
			}

			// For Sender data
			let senderFullName = sender.id;
			if( sender.clientDetail.firstName != undefined || sender.clientDetail.lastName != undefined )
			{
				senderFullName = sender.clientDetail.firstName + " " + sender.clientDetail.lastName;
			}

			const userData1 = {
				username: username1,
				wtsa: sender.phone,
				fullName: senderFullName,
				contacts: [{
					contactName: username2,
					hasNewMessages: false
				}]
			}
					
			// Create/Update relationships
			if( list.length == 1 )
			{
				if( list[0].username == username1 )
				{
					me.createNewUserWithContactUser( userData2, list[0], exeFunc);
				}
				else if( list[0].username == username2 )
				{
					me.createNewUserWithContactUser( userData1, list[0], exeFunc);
				}
			}
			else if( list.length == 0 )
			{
				me.createNewUserAndContactUser( userData1, userData2 );
			}
			else if( list.length == 2 )
			{
				me.updateContactList( list[0], list[1], exeFunc);
			}
		}).catch(function (err) {
			console.log("-- Couldn't create users because " + err.message );
		});
	};

	createNewUserWithContactUser( userData, contactData, exeFunc) {
		var me = this;
		userData.contacts = [{contactName: contactData.username, hasNewMessages: false}];
		me.createUser(userData, function(responseUserData){
			if( responseUserData.status=="success" )
			{
				me.updateContact( contactData, userData.username, function( responseContactData ) {
					if( responseContactData.status=="success" )
					{
						exeFunc( {status:"success", data: {user1: responseUserData.data, user2: responseContactData.data}} );
					}
					else
					{
						exeFunc(responseContactData);
					}
				} );
			}
			else
			{
				exeFunc(responseUserData);
			}
		});
	};

	createNewUserAndContactUser( userData, contactData, exeFunc) {
		var me = this;
		userData.contacts = [{contactName: contactData.username, hasNewMessages: false}];
		me.createUser(userData, function(responseUserData){
			if( responseUserData.status=="success" )
			{
				me.createUser(contactData, function( responseContactData ) {
					if( responseContactData.status=="success" )
					{
						exeFunc( {status:"success", data: {user1: responseUserData.data, user2: responseContactData.username}} );
					}
					else
					{
						exeFunc(responseContactData);
					}
				} );
			}
			else
			{
				exeFunc(responseUserData);
			}
		});
	};

	createUserByUsername( jsonUser, contactUsername, exeFunc ) {
		let data = jsonUser;
		data.contacts =  [{contactName: contactUsername, hasNewMessages: false}];

		// Save message to mongodb
		this.createUser( data, exeFunc );
	}

	updateContactList( userData1, userData2, exeFunc ) {
		var me = this;
		me.updateContact( userData1, userData2.username, function( responseUserData1 ) {
			if( responseUserData1.status=="success" )
			{
				me.updateContact( userData2, userData1.username, function( responseUserData2 ){
					if( responseUserData1.status=="success" )
					{
						exeFunc( {status:"success", data: {user1: responseUserData1.data, user2: responseUserData2.username}} );
					}
					else
					{
						exeFunc(responseUserData2);
					}
				});
			}
			else 
			{
				exeFunc(responseUserData1);
			}
		});
	}
	
	createUser( userData, exeFunc ) {
		const user = new UsersCollection( userData );
		user.save(function(err,result){ 
			if (err){ 
				if( exeFunc ) exeFunc({status: "error", msg: err});
			} 
			else{ 
				if( exeFunc ) exeFunc({status: "success", data: result}) 
			} 
		}) 
	}

	updateContact( userData, contactName, exeFunc ) {
		const found = serverUtils.findItemFromList( userData.contacts, contactName, "contactName");
		if( !found ) // contactName doesn't exsit in userData ==> add this 'contactName'
		{
			userData.contacts.push({ contactName: contactName, hasNewMessages: false } );
			userData.save(function(){
				if( exeFunc ) exeFunc( {status: "success", data: userData} );
			});
		}
		else // contactName exsits in userData ==> DON'T DO ANYTHING
		{
			if( exeFunc ) exeFunc( {status: "success", data: userData} );
		}
	}
};

module.exports = UserManagement;
