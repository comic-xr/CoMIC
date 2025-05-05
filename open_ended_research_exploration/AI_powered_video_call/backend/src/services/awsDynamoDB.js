import AWS from "aws-sdk";
import dotenv from "dotenv";
dotenv.config();

// Logging for debugging
console.log("DynamoDB Endpoint:", process.env.DYNAMO_DB_ENDPOINT || "http://localhost:8000");
console.log("AWS Region:", process.env.AWS_REGION || "us-east-2");

const docClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || "us-east-2",
  endpoint: process.env.DYNAMO_DB_ENDPOINT || "http://localhost:8000",
  accessKeyId: process.env.DYNAMO_DB_ACCESS_ID || "fake",
  secretAccessKey: process.env.DYNAMO_DB_SECRET_KEY || "fake",
});

const dynamodb = new AWS.DynamoDB({
  region: process.env.AWS_REGION || "us-east-2",
  endpoint: process.env.DYNAMO_DB_ENDPOINT || "http://localhost:8000",
  accessKeyId: process.env.DYNAMO_DB_ACCESS_ID || "fake",
  secretAccessKey: process.env.DYNAMO_DB_SECRET_KEY || "fake",
});

// ✅ Create tables with one client
const tables = [
  {
    TableName: "Meeting",
    KeySchema: [{ AttributeName: "meetingId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "meetingId", AttributeType: "S" }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: "UserInfo",
    KeySchema: [
      { AttributeName: "meetingId", KeyType: "HASH" },
      { AttributeName: "userName", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "meetingId", AttributeType: "S" },
      { AttributeName: "userName", AttributeType: "S" },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: "TranscriptionStore",
    KeySchema: [{ AttributeName: "meetingId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "meetingId", AttributeType: "S" }],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
];

const createTable = async () => {
  for (const table of tables) {
    try {
      await dynamodb.createTable(table).promise();
      console.log(`✅ Created table: ${table.TableName}`);
    } catch (err) {
      if (err.code === "ResourceInUseException") {
        console.log(`⚠️ Table already exists: ${table.TableName}`);
      } else {
        console.error(`❌ Failed to create table: ${table.TableName}`, err);
      }
    }
  }
};

export { docClient, createTable, dynamodb };
