// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');
const honeycode = new AWS.Honeycode();
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

const tableName = process.env.TABLE_NAME;
const workbookId = process.env.WORKBOOK_ID;  // Check the env value (Not working for local test)
const DEFAULT_ORDER_STATUS = "PENDING" // Default Order Status will be written to DynamoDB
const honeyCodeTableName = 'SyncData';

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
    
    const data_x = parsedBody.data_x;
    const data_y = parsedBody.data_y;
    console.log(`** Input params ===>>> DX: ${data_x}, DY: ${data_y} `)
    
    const req_id = messageId;
    
    // ====== Put data to the DynamoDB =======
    // The item contains fully order Item. 
    let item = {
        user_id : "static_user",   
        req_id: req_id,
        data_x: data_x,
        data_y: data_y,
        createdAt: formattedDateNow,
        orderStatus: DEFAULT_ORDER_STATUS,
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
    console.log(`***** sync table id : ${sync_table_id}`);
    const { tableColumns } = await honeycode.listTableColumns({
            workbookId, tableId: sync_table_id
    }).promise()
    
    //Convert to array of column names
    const columns = tableColumns.map(column => ({ key: column.tableColumnName }))
    
    const userRequestColId = tableColumns[0].tableColumnId;
    const serverResponseColId = tableColumns[1].tableColumnId;
    const infoColId = tableColumns[2].tableColumnId;
    const timeId = tableColumns[3].tableColumnId;
    
    console.log(`** req_col : ${userRequestColId}, res_col: ${serverResponseColId}, info_col: ${infoColId}`);
    
    const min = 1;
    const max = 9999;
    const invokeResult = Math.floor(Math.random() * (max - min + 1)) + min;
    
    const userRequestData = `data_x => ${data_x} || data_y => ${data_y}`;
    const serverResponseData = `You put X: ${data_x} and Y: ${data_y}, The result is ${invokeResult}`;
    const infoData = `FINISHED`;
    
    const rowsToCreate = [{
        batchItemId: req_id,
        cellsToCreate: {
            [userRequestColId]: { fact: userRequestData },
            [serverResponseColId]: { fact: serverResponseData},
            [infoColId]: { fact : infoData },
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


exports.postOrders = async (event) => {
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
