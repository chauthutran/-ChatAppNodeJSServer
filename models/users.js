const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true
	},
	fullName: {
			type: String,
			required: true
	},
	contacts: [
		{
			contactName: String,
			hasNewMessages: Boolean,
		}
	],
	wtsa: {
		type: String,
		required: false
	}
})

// const UsersCollection = mongoose.model('users1', userSchema);
const UsersCollection = mongoose.model('wfaChatUsers', userSchema);
module.exports = UsersCollection;