import { docClient } from "../services/awsDynamoDB.js";

const insertTranscriptionDB = async (req, res) => {
  try {
    const { meetingId, transcript } = req.body;

    console.log(`dynamo db transcripts message ${meetingId} and ${transcript} `);

    if (!meetingId || !transcript) {
      return res
        .status(400)
        .json({ error: "Missing meetingId or transcripts" });
    }

    await storeTranscription(meetingId, transcript);
    res.status(200).json({ message: "Transcription inserted successfully" });
  } catch (error) {
    console.error("❌ Error inserting transcription into DynamoDB", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to store a transcription that can be called internally
const storeTranscription = async (meetingId, transcript) => {
  try {
    const timestamp = new Date().toISOString();
    
    const params = {
      TableName: "TranscriptionStore",
      Item: {
        meetingId,
        transcript,
        timestamp,
        // Adding a unique sort key for efficient querying
        transcriptId: `${meetingId}-${Date.now()}`
      },
    };

    await docClient.put(params).promise();
    console.log(`✅ Transcription stored for meeting ${meetingId}`);
    return true;
  } catch (error) {
    console.error("❌ Error storing transcription in DynamoDB", error);
    console.error("Full error details:", JSON.stringify(error));
    return false;
  }
};

const insertNewMeetingDB = async (meetingID, userNameInfo) => {
  try {
    const params = {
      TableName: "UserInfo",
      Item: {
        meetingId: meetingID,
        userName: userNameInfo,
      },
    };

    await docClient.put(params).promise();
    console.log("Meeting ID inserted successfully");
  } catch (error) {
    console.error("❌ Error inserting meeting info into DynamoDB", error);
    console.error("Full error details:", JSON.stringify(error));
  }
};

// Function to get all transcriptions for a meeting
const getTranscriptionsDB = async (meetingId) => {
  try {
    const params = {
      TableName: "TranscriptionStore",
      KeyConditionExpression: "meetingId = :meetingId",
      ExpressionAttributeValues: {
        ":meetingId": meetingId
      }
    };
    
    const data = await docClient.query(params).promise();
    return data.Items || [];
  } catch (error) {
    console.error("❌ Error getting transcriptions from DynamoDB", error);
    console.error("Full error details:", JSON.stringify(error));
    return [];
  }
};

/*const insertNewUserDB = async () => {
  try {
    const { meetingId, transcripts } = req.params();
    const params = {
      TableName: "TranscriptionStore",
      Item: {
        meetingID: meetingId,
        transcript: transcripts,
      },
    };

    await docClient.put(params).promise();
    console.log("✅ Sample transcription inserted");
  } catch (error) {
    console.error("Error in inserting transcription:", error);
  }
};*/

export { 
  insertTranscriptionDB, 
  insertNewMeetingDB, 
  storeTranscription,
  getTranscriptionsDB 
};
