export API_ENDPOINT=https://tk3g1molxj.execute-api.us-west-2.amazonaws.com/Dev/chat

curl -s --header "Content-Type: application/json" \
  --request POST \
  --data '{"user_utterance":"It is simple user utterance"}' \
  $API_ENDPOINT | python3 -m json.tool 
  
  
  