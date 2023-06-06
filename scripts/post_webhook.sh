export API_ENDPOINT=https://tk3g1molxj.execute-api.us-west-2.amazonaws.com/Dev/orders

curl -s --header "Content-Type: application/json" \
  --request POST \
  --data '{"data_x":"this-is-data-x","data_y":"this is the data y"}' \
  $API_ENDPOINT | python3 -m json.tool 