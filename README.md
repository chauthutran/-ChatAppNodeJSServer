# To deploy this Chat Server 
#    1. In the file messageUtils.js, change the variable "WTSA_URL" to proper Whatsapp service URL
#       + https://api-dev.psi-connect.org/TTS.wtsaMsgSend
#       + https://api-test.psi-connect.org/TTS.wtsaMsgSend
#    2. in server file, such as "siChatSrvDEV.js" or "siChatSrvDEV.js", change the "clientURL" to proper WFA Application
#    3. For WFA Application, in mongodb, make sure that the users logged ( such as "GT2_TEST_IPC", "ZW_TEST_IPC", ...) have a phone number which is used for WhatsApp
