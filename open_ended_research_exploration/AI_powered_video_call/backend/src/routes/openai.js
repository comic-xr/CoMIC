import express from 'express';
import { 
  CreateEphermeralToken,
  AskAssistant,
  GetMeetingTranscriptions
} from '../controllers/openai_controller.js';

const router = express.Router();

// Create ephemeral token for real-time capabilities
router.get("/session", CreateEphermeralToken);

// Process a question using the assistant
router.post("/ask", AskAssistant);

// Get all transcriptions for a meeting
router.get("/transcriptions/:meetingId", GetMeetingTranscriptions);

export default router;  