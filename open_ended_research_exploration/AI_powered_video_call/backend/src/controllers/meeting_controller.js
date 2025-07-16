import { v4 as uuidv4 } from "uuid";
import { redisMeetingRoom, redisGetMeetingRoom } from "../services/redis.js";
import { insertNewMeetingDB } from "./dynamoDB_controller.js";

const CreateMeetingRoom = async (req, res) => {
  try {
    // Generate a random meeting ID using uuid
    const meetingId = uuidv4();

    // Store in Redis
    const result = await redisMeetingRoom(meetingId, req.body.name);

    if (!result) {
      return res.status(500).json({ error: "Failed to create meeting room" });
    }
    const dbInsert = await insertNewMeetingDB(meetingId, req.body.name);
    console.info(`status of db insert ${dbInsert} `);

    res.json({ message: "Meeting room created successfully", meetingId });
  } catch (error) {
    console.error("Error in createoffer:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const CheckMeetingRoom = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meetingRoom = await redisGetMeetingRoom(meetingId);

    if (!meetingRoom) {
      return res.status(404).json({ error: "Meeting room not found" });
    }

    res.json({ meetingRoom });
  } catch (error) {
    console.error("Error getting meeting room:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { CreateMeetingRoom, CheckMeetingRoom };
