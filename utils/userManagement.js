

const UsersCollection = require("../models/users");
const {ServerUtils} = require("./utils");
const serverUtils = new ServerUtils();

const UserManagement = class {
	constructor() {
	}

	createIfNotExist( username1, username2, exeFunc ) {
		UsersCollection.find().or([
			{ username: username1 },
			{ username: username2 }
		]).then(( list ) => {
			var me = this;
			if( list.length == 1 )
			{
				if( list[0].username == username1 )
				{
					this.createUserByUsername(username2, username1, function(newUserData2){
						me.updateContact( list[0], username2, function( newUserData1 ) {
							exeFunc( [newUserData1, newUserData2] );
						} );
					} );
					
				}
				else if( list[0].username == username2 )
				{
					this.createUserByUsername(username1, username2, function( newUserData1 ){
						me.updateContact( list[0], username1, function( newUserData2 ) {
							exeFunc( [newUserData1, newUserData2] );
						} );
					} );
				}
			}
			else if( list.length == 0 )
			{
				this.createUserByUsername(me.username1, username2, function( userData1 ){
					me.createUserByUsername(me.username2, username1, function( userData2 ){
						exeFunc([userData1, userData2]); // Should put the userData for username1 and username2
					});
				});
				
			}
			else if( list.length == 2 )
			{
				// Check ContactList and update
				if( list[0].username == username1 )
				{
					me.updateContact( list[0], username2, function( userData1 ) {
						me.updateContact( list[1], username1, function( userData2 ){
							exeFunc([userData1, userData2]);
						});
					});
				}
				else
				{
					me.updateContact( list[0], username1, function( userData1 ) {
						me.updateContact( list[1], username2, function(userData2){
							exeFunc([userData1, userData2]);
						} )
					})
				}
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
					me.createUser(userData2, function(newUserData2){
						me.updateContact( list[0], username2, function( newUserData1 ) {
							exeFunc( [newUserData1, newUserData2] );
						} );
					} );
					
				}
				else if( list[0].username == username2 )
				{
					me.createUser(userData1, function( newUserData1 ){
						me.updateContact( list[0], username1, function( newUserData2 ) {
							exeFunc( [newUserData1, newUserData2] );
						} );
					} );
				}
			}
			else if( list.length == 0 )
			{
				me.createUser(userData1, function( newUserData1 ){
					me.createUser(userData2, function( newUserData2 ){
						exeFunc([newUserData1, newUserData2]); // Should put the userData for username1 and username2
					});
				});
				
			}
			else if( list.length == 2 )
			{
				// Check ContactList and update
				if( list[0].username == username1 )
				{
					me.updateContact( list[0], username2, function( userData1 ) {
						me.updateContact( list[1], username1, function( userData2 ){
							exeFunc([userData1, userData2]);
						});
					});
				}
				else
				{
					me.updateContact( list[0], username1, function( userData1 ) {
						me.updateContact( list[1], username2, function(userData2){
							exeFunc([userData1, userData2]);
						} )
					})
				}
			}
		}).catch(function (err) {
			console.log("-- Couldn't create users because " + err.message );
		});
	};

	createUserByUsername( username, contact, exeFunc ) {
		const data = {
			username: username,
			fullName: username,
			contacts: [{contactName: contact, hasNewMessages: false}]
		}

		// Save message to mongodb
		this.createUser( data, exeFunc );
	}

	
	createUser( userData, exeFunc ) {
		// Save message to mongodb
		const user = new UsersCollection( userData );
		user.save(function(a, newUser, c){
			if( exeFunc ) exeFunc( newUser );
		})
	}

	updateContact( userData, contactName, exeFunc ) {
		const found = serverUtils.findItemFromList( userData.contacts, contactName, "contactName");
		if( !found )
		{
			userData.contacts.push({ contactName: contactName, hasNewMessages: false } );

			userData.save(function(){
				if( exeFunc ) exeFunc( userData );
			});
		}
		else
		{
			if( exeFunc ) exeFunc( userData );
		}
		
	}
};

module.exports = UserManagement;
