import express from "express";
import {
  CreateMeetingRoom,
  CheckMeetingRoom,
} from "../controllers/meeting_controller.js";
import {insertTranscriptionDB} from "../controllers/dynamoDB_controller.js"

const router = express.Router();

router.post("/createmeetingroom", CreateMeetingRoom);
router.get("/checkmeetingroom/:meetingId", CheckMeetingRoom);
router.post("/transcription", insertTranscriptionDB);

export default router;
