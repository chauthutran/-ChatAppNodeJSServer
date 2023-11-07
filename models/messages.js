const mongoose = require('mongoose');
const msgSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
	receiver: {
        type: String,
        required: true
    },
	msg: {
		type: String,
		required: true
	},
	datetime: {
		type: String,
		required: true
	},
	filetype: {
		type: String,
		required: false
	},
	name: {
        type: String,
        required: false
    },
	msgtype: {
        type: String,
        required: false
    }
})

const MessagesCollection = mongoose.model('wfaChatMsgs', msgSchema);
module.exports = MessagesCollection;