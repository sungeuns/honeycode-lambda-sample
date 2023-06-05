cd ..
sam build
# sam local invoke "PostOrders" -e events/webhook-event.json -n env/env.json
sam local invoke "PostOrders" -e events/webhook-sqs-event.json -n env/env.json