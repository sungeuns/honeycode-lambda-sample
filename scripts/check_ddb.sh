export AWS_REGION=us-west-2

aws dynamodb describe-table --table-name honey-table-01 --region $AWS_REGION