
# Honeycode + Lambda

- Honeycode와 APIG + Lambda (serverless stack) 을 사용하는 예시입니다.
- 추가로 SageMaker endpoint invoke 를 넣는 예시도 있습니다.


## Honeycode 설정

1. AWS account link
2. workbook에 table 생성
3. App 제작 (honeycode app export 기능이 없음.)


## SAM 을 활용한 serverless backend 배포

### Serverless stack

- 먼저 `template.yaml` 에서 환경변수를 수정해야 합니다.
  - `TABLE_NAME` : DynamoDB table name
  - `WORKBOOK_ID` : Honeycode workbook id
  - `SM_ENDPOINT` : SageMaker endpoint (현재 예시는 dolly v2 endpoint with DJL를 사용함.)

```
# deploy 실행
./deploy.sh
```

### SageMaker endpoint 배포

- [여기](https://github.com/sungeuns/gen-ai-sagemaker/blob/main/Dolly/02-sagemaker-endpoint-dolly.ipynb) 를 참고할 것.

