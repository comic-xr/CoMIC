import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

console.log("OpenAI Initialization");
console.log("API Key available:", process.env.OPENAI_API_KEY ? "Yes (length: " + process.env.OPENAI_API_KEY.length + ")" : "No");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store assistants and threads for each meeting
const meetingAssistants = {};

// Test OpenAI connection
(async () => {
  try {
    console.log("Testing OpenAI connection...");
    const models = await openai.models.list();
    console.log("✅ OpenAI connection successful, available models:", models.data.map(m => m.id).slice(0, 5));
  } catch (error) {
    console.error("❌ OpenAI connection failed:", error.message);
    console.error("This will affect the assistant functionality");
  }
})();

// Create or get assistant for a meeting
async function getAssistantForMeeting(meetingId) {
  // If we already have an assistant for this meeting, return it
  if (meetingAssistants[meetingId] && meetingAssistants[meetingId].assistant) {
    console.log(`Using existing assistant for meeting ${meetingId}`);
    return meetingAssistants[meetingId].assistant;
  }

  console.log(`Creating new assistant for meeting ${meetingId}`);
  
  try {
    // Create a new assistant
    const assistant = await openai.beta.assistants.create({
      name: `Meeting Assistant for ${meetingId}`,
      instructions: `You are an AI assistant helping with a meeting or class. 
      Answer questions based only on the information in the provided transcription.
      If the answer is not in the transcription data, politely say you don't have that information from the meeting.
      Keep your answers concise and helpful.`,
      model: "gpt-4o",
    });
    
    console.log(`✅ Created new assistant with ID: ${assistant.id} for meeting ${meetingId}`);
    
    // Create a thread for this meeting
    const thread = await openai.beta.threads.create();
    console.log(`✅ Created new thread with ID: ${thread.id} for meeting ${meetingId}`);
    
    // Store the assistant and thread
    meetingAssistants[meetingId] = {
      assistant: assistant,
      thread: thread,
      transcriptions: []
    };
    
    return assistant;
  } catch (error) {
    console.error(`❌ Error creating assistant for meeting ${meetingId}:`, error);
    throw error;
  }
}

// Add transcription to a meeting's context
const addTranscription = async (meetingId, transcript) => {
  console.log(`Adding transcription for meeting ${meetingId}: "${transcript.substring(0, 30)}..."`);
  
  try {
    // Get or create assistant and thread for this meeting
    const assistant = await getAssistantForMeeting(meetingId);
    
    if (!meetingAssistants[meetingId].transcriptions) {
      meetingAssistants[meetingId].transcriptions = [];
    }
    
    // Add timestamp to the transcript
    const timestampedTranscript = {
      text: transcript,
      timestamp: new Date().toISOString()
    };
    
    // Add to the meeting's transcriptions
    meetingAssistants[meetingId].transcriptions.push(timestampedTranscript);
    
    // Keep only the latest transcriptions to manage context size
    if (meetingAssistants[meetingId].transcriptions.length > 100) {
      meetingAssistants[meetingId].transcriptions = meetingAssistants[meetingId].transcriptions.slice(-100);
    }
    
    // Add the transcript to the thread
    const threadId = meetingAssistants[meetingId].thread.id;
    
    // Format the timestamp
    const formattedTime = new Date(timestampedTranscript.timestamp).toLocaleTimeString();
    
    // Add message to thread
    await openai.beta.threads.messages.create(
      threadId,
      {
        role: "user",
        content: `[Transcript at ${formattedTime}]: ${transcript}`
      }
    );
    
    console.log(`Meeting ${meetingId} now has ${meetingAssistants[meetingId].transcriptions.length} transcription entries`);
    return timestampedTranscript;
  } catch (error) {
    console.error(`❌ Error adding transcription for meeting ${meetingId}:`, error);
    return null;
  }
};

// Get all transcriptions for a meeting
const getTranscriptions = (meetingId) => {
  const transcriptions = meetingAssistants[meetingId]?.transcriptions || [];
  console.log(`Retrieved ${transcriptions.length} transcriptions for meeting ${meetingId}`);
  return transcriptions;
};

// Clear transcriptions for a meeting
const clearTranscriptions = async (meetingId) => {
  if (meetingAssistants[meetingId]) {
    try {
      // Delete the thread
      if (meetingAssistants[meetingId].thread) {
        await openai.beta.threads.del(meetingAssistants[meetingId].thread.id);
        console.log(`Deleted thread for meeting ${meetingId}`);
      }
      
      // Create a new thread
      const thread = await openai.beta.threads.create();
      console.log(`Created new thread with ID: ${thread.id} for meeting ${meetingId}`);
      
      // Reset transcriptions
      meetingAssistants[meetingId].thread = thread;
      meetingAssistants[meetingId].transcriptions = [];
      
      console.log(`Cleared transcriptions for meeting ${meetingId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error clearing transcriptions for meeting ${meetingId}:`, error);
      return false;
    }
  }
  console.log(`No transcriptions found to clear for meeting ${meetingId}`);
  return false;
};

// Process a question using the meeting's assistant
const processQuestion = async (meetingId, question) => {
  console.log(`Processing question for meeting ${meetingId}: "${question}"`);
  
  try {
    // Check if we have an assistant for this meeting
    if (!meetingAssistants[meetingId]) {
      console.log(`No assistant found for meeting ${meetingId}, creating new one...`);
      await getAssistantForMeeting(meetingId);
    }
    
    // Check if we have any transcriptions
    if (!meetingAssistants[meetingId].transcriptions || meetingAssistants[meetingId].transcriptions.length === 0) {
      console.log(`No transcription data available for meeting ${meetingId}`);
      return {
        success: false,
        message: "No transcription data available for this meeting yet."
      };
    }
    
    const assistantId = meetingAssistants[meetingId].assistant.id;
    const threadId = meetingAssistants[meetingId].thread.id;
    
    // Add user question to thread
    await openai.beta.threads.messages.create(
      threadId,
      {
        role: "user",
        content: question
      }
    );
    
    console.log(`Added question to thread ${threadId} for assistant ${assistantId}`);
    
    // Run the assistant to process the question
    const run = await openai.beta.threads.runs.create(
      threadId,
      { assistant_id: assistantId }
    );
    
    console.log(`Started run ${run.id} for thread ${threadId}`);
    
    // Poll for the result
    let runStatus = await openai.beta.threads.runs.retrieve(
      threadId,
      run.id
    );
    
    // Wait until the run completes
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      if (runStatus.status === "requires_action" || runStatus.status === "cancelled" || runStatus.status === "expired") {
        console.log(`Run ${run.id} status: ${runStatus.status}`);
        break;
      }
      
      // Wait a second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      runStatus = await openai.beta.threads.runs.retrieve(
        threadId,
        run.id
      );
      
      console.log(`Run ${run.id} status: ${runStatus.status}`);
    }
    
    if (runStatus.status !== "completed") {
      console.error(`Run ${run.id} failed with status: ${runStatus.status}`);
      return {
        success: false,
        message: "I'm sorry, I wasn't able to process your question. Please try again."
      };
    }
    
    // Get the latest message from the thread (the assistant's response)
    const messages = await openai.beta.threads.messages.list(
      threadId
    );
    
    const assistantMessage = messages.data.find(msg => msg.role === "assistant");
    
    if (!assistantMessage) {
      console.error(`No assistant message found in thread ${threadId}`);
      return {
        success: false,
        message: "I wasn't able to generate a response. Please try again."
      };
    }
    
    // Extract the response text
    const responseText = assistantMessage.content[0].text.value;
    
    console.log(`✅ Received response from assistant for meeting ${meetingId}`);
    
    return {
      success: true,
      answer: responseText
    };
    
  } catch (error) {
    console.error("❌ Error processing question with OpenAI assistant:", error);
    return {
      success: false,
      message: "Failed to process your question. Please try again later."
    };
  }
};

export {
  addTranscription,
  getTranscriptions,
  clearTranscriptions,
  processQuestion
}; 