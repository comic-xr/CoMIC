import { processQuestion, getTranscriptions } from "../services/openai.js";
import { docClient } from "../services/awsDynamoDB.js";

// Create Ephemeral Token
const CreateEphermeralToken = async (req, res) => {
  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "verse",
    }),
  });
  const data = await r.json();
  console.log("Ephermeral token:", data);
  // Send back the JSON we received from the OpenAI REST API
  return res.json(data);
};

// Process a question for a meeting using the assistant
const AskAssistant = async (req, res) => {
  try {
    const { meetingId, question } = req.body;
    
    if (!meetingId || !question) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting ID and question are required" 
      });
    }
    
    console.log(`Processing question for meeting ${meetingId}: "${question}"`);
    
    const response = await processQuestion(meetingId, question);
    
    return res.json(response);
  } catch (error) {
    console.error("Error in AskAssistant:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get all transcriptions for a meeting
const GetMeetingTranscriptions = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    if (!meetingId) {
      return res.status(400).json({ 
        success: false, 
        message: "Meeting ID is required" 
      });
    }
    
    // First, try to get in-memory transcriptions
    const transcriptions = getTranscriptions(meetingId);
    
    // If we don't have any in-memory, try to get from DynamoDB
    if (!transcriptions.length) {
      try {
        const params = {
          TableName: "TranscriptionStore",
          KeyConditionExpression: "meetingId = :meetingId",
          ExpressionAttributeValues: {
            ":meetingId": meetingId
          }
        };
        
        const dbData = await docClient.query(params).promise();
        
        if (dbData.Items && dbData.Items.length > 0) {
          return res.json({
            success: true,
            transcriptions: dbData.Items.map(item => ({
              text: item.transcript,
              timestamp: item.timestamp || new Date().toISOString()
            }))
          });
        }
      } catch (dbError) {
        console.error("Error querying DB for transcriptions:", dbError);
      }
    }
    
    return res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    console.error("Error in GetMeetingTranscriptions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export { CreateEphermeralToken, AskAssistant, GetMeetingTranscriptions };