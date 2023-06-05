// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');
const honeycode = new AWS.Honeycode();
const sagemaker = new AWS.SageMakerRuntime();
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();
const sagemakerEndpoint = process.env.SM_ENDPOINT;
const tableName = process.env.TABLE_NAME;
const workbookId = process.env.WORKBOOK_ID;  // Check the env value (Not working for local test)
const DEFAULT_ORDER_STATUS = "PENDING" // Default Order Status will be written to DynamoDB
const honeyCodeTableName = 'ChatData';

// The function returns current date
const getCurrentDate = () => {
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    
    const datetime = year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds;
    const timestamp = Math.floor(date_ob / 1000);
    
    return {
        formattedDateNow: datetime.toString(),
        timestamp
    }
}

const processFunction = async (parsedBody, messageId) => {
    
    const {formattedDateNow, timestamp} = getCurrentDate();
    // const formattedDateNow = getCurrentDate().toString();
    console.log(`Date & Time : ${formattedDateNow}`);
    console.log(`TS : ${timestamp}`);
    
    const user_utter = parsedBody.user_utterance;
    console.log(`** Input ===>>> utter: ${user_utter}`);
    
    // ===== Invoke from SageMaker ======
    
    const inputValue = {
        "text" : user_utter
    }
    
    const invokeParams = {
        EndpointName: sagemakerEndpoint,
        Body: JSON.stringify(inputValue),
        ContentType: 'application/json'
    };
        
    const invokeResult = await sagemaker.invokeEndpoint(invokeParams).promise();
    const invokeBody = invokeResult.Body.toString('utf-8');
    const sagemakerOutput = JSON.parse(invokeBody)[0]["generated_text"];
    
    console.log(`*** SageMaker output : ${sagemakerOutput}`);
    
    const req_id = messageId;
    
    // ====== Put data to the DynamoDB =======
    // The item contains fully order Item. 
    let item = {
        user_id : "static_user",   
        req_id: req_id,
        user_utterance: user_utter,
        sagemaker_output: sagemakerOutput,
        createdAt: formattedDateNow
    }
    
    let params = {
        TableName : tableName,
        Item: item
    }; 

    // We use 'put' operator to put item to Dynamodb.
    try {
        const data = await docClient.put(params).promise()
        console.log("Success for putting Item")
    } catch (err) {
        console.log("Failure", err.message)
    }
    
    // ======= Honeycode table update
    console.log(`Workbook ID : ${workbookId}`);
    
    const { tables } = await honeycode.listTables({ workbookId }).promise();
    const tableIds = tables.reduce((tables, table) => {
        tables[table.tableName] = table.tableId
        return tables
    }, {});
    const sync_table_id = tableIds[honeyCodeTableName];
    console.log(`***** chat table id : ${sync_table_id}`);
    const { tableColumns } = await honeycode.listTableColumns({
            workbookId, tableId: sync_table_id
    }).promise()
    
    //Convert to array of column names
    const columns = tableColumns.map(column => ({ key: column.tableColumnName }))
    
    const userUtterColId = tableColumns[0].tableColumnId;
    const serverResponseColId = tableColumns[1].tableColumnId;
    const statusColId = tableColumns[2].tableColumnId;
    const metadataColId = tableColumns[3].tableColumnId;
    const timeId = tableColumns[4].tableColumnId;
    
    const rowsToCreate = [{
        batchItemId: req_id,
        cellsToCreate: {
            [userUtterColId]: { fact: user_utter },
            [serverResponseColId]: { fact: sagemakerOutput},
            [statusColId]: { fact : "FINISHED" },
            [metadataColId]: { fact: req_id},
            [timeId]: { fact : timestamp.toString() },
        }
    }];
    
    const hc_result = await honeycode.batchCreateTableRows({
        workbookId, tableId: sync_table_id, rowsToCreate
    }).promise();
    
    console.log(hc_result);
    
    if (hc_result.failedBatchItems) {
        console.error('Failed to update export date', 
            JSON.stringify(hc_result.failedBatchItems, null, 2))
    }
    
    return item;
}


exports.postChat = async (event) => {
    for (const record of event.Records) {
        const { messageId, body } = record;
        let parsedBody = JSON.parse(body); // It parses the JSON payload to java script object 
        const processResult = await processFunction(parsedBody.data, messageId);
    }
    
    const response = {
        statusCode: 200,
    }
    
    return response;
}
