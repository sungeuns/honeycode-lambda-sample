
# Honeycode + Lambda

- 첫번째 예시는 Honeycode와 APIG + Lambda (serverless stack) 을 사용하는 예시입니다.
- 두번째 예시는 SageMaker endpoint invoke 를 사용하는 예시
- 해당 repo는 `us-west-2` region 기준으로 테스트 되었습니다.


## Honeycode 설정

1. AWS account link
2. workbook에 table 생성
3. App 제작 (honeycode app export 기능이 없기 때문에 직접 제작 필요)


## SAM 을 활용한 serverless backend 배포

### Serverless backend 배포

먼저 `template.yaml` 에서 환경변수를 수정해야 합니다.
- `TABLE_NAME` : DynamoDB table name 은 바꿀 필요가 없기 때문에 그대로 놔둡니다.
- `WORKBOOK_ID` : Honeycode workbook id는 honeycode 에서 확인할 수 있습니다.
- `SM_ENDPOINT` : SageMaker endpoint는 미리 생성해 둔 (InService 상태의) SageMaker endpoint name 을 입력합니다.

추가로 `samconfig.toml` 에서 값을 수정합니다.
- `stack_name`, `s3_prefix`는 원하는 값으로 설정합니다.
- `s3_bucket`은, 먼저 s3에서 동일 region 의 bucket 생성 후 그 이름을 입력합니다.

Deploy를 실행합니다. 패키지 버전 및 IAM role 설정을 따로 해 줄 필요가 없기 떄문에 Cloud9 에서 실행하는 것을 추천합니다.

```
# deploy 실행
./deploy.sh
```

## Backend 배포 후 테스트

`API_ENDPOINT` 값을 먼저 바꾸어 주어야 합니다. 해당 값은 CloudFormation의 output에 `OrderApiEndpoint` 를 참고해 주세요.

```
cd scripts

# DynamoDB 생성을 확인함.
./check_ddb.sh

# 간단한 curl 명령어를 통해 webhook 가능한지 체크함.
./post_webhook.sh
```

webhook 실행 시 아래와 같은 결과가 나오면 정상적으로 배포가 된 것입니다.

```
{
    "SendMessageResponse": {
        "ResponseMetadata": {
            "RequestId": "d84c52f8-3c08-5835-ac8a-0e01768a345a"
        },
        "SendMessageResult": {
            "MD5OfMessageAttributes": null,
            "MD5OfMessageBody": "3ef03c0e787fe599f526b4ed24ef907c",
            "MD5OfMessageSystemAttributes": null,
            "MessageId": "b3ca0675-4b36-468e-85a5-181a5e34f590",
            "SequenceNumber": null
        }
    }
}
```

- 참고로 SageMaker 연동 시에는, API gateway 주소가 달라질 수 있습니다. 해당 git 예시에서는 `scripts/chat.sh`의 API endpoint 를 참고해 주세요.
- Honeycode에서 webhook으로 들어오는 request data를 받아서 sagemaker endpoint를 invoke 하는 부분은 `src/order-api/functions/post-chat/app.js`의 `Invoke from SageMaker` 부분을 참고해 주세요

### SageMaker endpoint 배포

post-chat이 호출하는 sagemaker endpoint 코드 예시
- [여기](https://github.com/sungeuns/gen-ai-sagemaker/blob/main/Dolly/02-sagemaker-endpoint-dolly.ipynb) 를 참고해 주세요.

좀 더 간단한 sagemaker endpoint 예시
- TBU


