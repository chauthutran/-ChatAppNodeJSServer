

const UsersCollection = require("../models/users");
const {ServerUtils} = require("./utils");
const serverUtils = new ServerUtils();

const UserManagement = class {
	constructor() {
		this.total = 0;
		this.processingIdx = 0;
		this.successList = {};
		this.errorList = {};
	}

	/**
	 * 
	 * @param userList [ {username, Wtsa, fullName, ...}, {username, Wtsa, fullName, ...}, ... ]
	 */
	createUserList( userList, exeFunc ) {
		let me = this;

		let usernameList = userList.map(function(user){ return { username: user.username}; });
		UsersCollection.find().or(usernameList).then(( list ) => {
			let jsonUserList = list;

			// Merge search result list and "userList"
			for( let i=0; i<userList.length; i++ )
			{
				let userData = userList[i];
				let found = serverUtils.findItemFromList(list, userData.username, "username");
				if( !found )
				{
					jsonUserList.push(userData);
				}
			}

			// Save list of user
			me.saveUsers( jsonUserList, function(){
				exeFunc({"successList": me.successList, "errorList": me.errorList });
			} );
		});
	};

	saveUsers( userList, doneFunc ) {
		var me = this;
		me.total = userList.length;
		me.processingIdx = 0;
		me.successList = {};
		me.errorList = {};

		var me = this;
		for( let i=0; i<userList.length; i++ )
		{
			var userData = userList[i];
			me.setContactListForUser( userData, userList );
			me.createUser( userData, doneFunc );
		}
	}

	setContactListForUser( userData, contactList, exeFunc ) {
		if( userData.contacts == undefined ) userData.contacts = [];

		var newContacts = contactList.filter(function(item){ 
			var found = serverUtils.findItemFromList(userData.contacts, item.username, "contactName");
			return ( item.username != userData.username && !found );
		}).map(function(item){
			return { contactName: item.username, hasNewMessages: false };
		});
		
		userData.contacts = userData.contacts.concat( newContacts );
	}
	
	createWtsaUserIfNotExist( sender, receiver, exeFunc ) {
		const username1 = sender.id;
		const username2 = receiver.id;

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
				
		const userList = [userData1, userData2];
		UsersCollection.find().or([
			{ username: username1 },
			{ username: username2 }
		]).then(( list ) => {

			var me = this;

			
			let jsonUserList = list;

			// Merge search result list and "userList"
			for( let i=0; i<userList.length; i++ )
			{
				let userData = userList[i];
				let found = serverUtils.findItemFromList(list, userData.username, "username");
				if( !found )
				{
					jsonUserList.push(userData);
				}
			}

			// Save list of user
			me.saveUsers( jsonUserList, function(){
				exeFunc({"successList": me.successList, "errorList": me.errorList });
			} );

			// // Create/Update relationships
			// if( list.length == 1 )
			// {
			// 	if( list[0].username == username1 )
			// 	{
			// 		me.createNewUserWithContactUser( userData2, list[0], exeFunc);
			// 	}
			// 	else if( list[0].username == username2 )
			// 	{
			// 		me.createNewUserWithContactUser( userData1, list[0], exeFunc);
			// 	}
			// }
			// else if( list.length == 0 )
			// {
			// 	me.createNewUserAndContactUser( userData1, userData2 );
			// }
			// else if( list.length == 2 )
			// {
			// 	me.updateContactList( list[0], list[1], exeFunc);
			// }
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
	
	createUser( userData, doneFunc ) {
		let me = this;

		const user = new UsersCollection( userData );
		user.save(function(err, result){
			if (err){
				me.errorList[userData.username] = err;
			} 
			else {
				me.successList[userData.username] = result; 
			}

			me.processingIdx++;
			if( me.processingIdx ==	me.total )
			{
				doneFunc();
			}
		});
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
