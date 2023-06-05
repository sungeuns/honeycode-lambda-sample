cd ..
sam build
sam local invoke "PostChat" -e events/chat-sqs-event.json -n env/env.json