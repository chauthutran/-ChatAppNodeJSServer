const WTSA_URL = "https://api-dev.psi-connect.org/TTS.wtsaMsgSend";
// const WTSA_URL = "https://api-test.psi-connect.org/TTS.wtsaMsgSend";
const axios = require('axios');

const {ServerUtils} = require("./utils");
const serverUtils = new ServerUtils();
const MessagesCollection = require("../models/messages");
const UsersCollection = require("../models/users");

class MessageUtils {
    constructor( ) {
	}

	sendWtsaMessage( sendUsername, receiveUsername, message, fileType, fileUrl ) {
        console.log("--- Whatsapp sending data ");

        try{

            let me = this;
            
            UsersCollection.find().or([
                { username: sendUsername },
                { username: receiveUsername }
            ])
            .then(( list ) => {
                if(list.length == 2 )
                {
                    const senderUser = serverUtils.findItemFromList( list, sendUsername, "username" );
                    const receiveUser = serverUtils.findItemFromList( list, receiveUsername, "username" );

                    if( receiveUser.wtsa != undefined )
                    {
                        const data = {
                            "msgJson": {
                                "msg": message,
                                "sendUsername": sendUsername,
                                "receiveUserName": receiveUsername,
                                "toPhoneNumber": receiveUser.wtsa,
                                "fromPhoneNumber": senderUser.wtsa,
                                fileType,
                                fileUrl
                            } 
                        }

                        axios.post( WTSA_URL, data )
                            .then(function (response) {
                                console.log("-- The message is sent to Whatsapp.");
                            })
                            .catch(function (err) {
                                console.log("-- The message couldn't be sent to Whatsapp." + err.message );
                                console.log( err );
                                console.log( data );
                            });
                    }
                }
            })
        }
        catch( ex )
        {
            console.log("-- ERROR ( Whatsapp sending data ). " + ex.message );
        }

    }
}

module.exports = {
    MessageUtils
};
