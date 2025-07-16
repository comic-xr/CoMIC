import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_URL,
        port: process.env.REDIS_PORT
    }
});

client.on('error', err => console.log('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client Connected'));

async function redisMeetingRoom(meetingId, name) {
    try {
        // Store meeting id in Redis
        await client.set(meetingId, JSON.stringify({
            name: name,
            meetingId: meetingId
        }));
        return true;
    } catch (error) {
        console.error('Error creating meeting room:', error);
        return false;
    }
}

async function redisGetMeetingRoom(meetingId) {
    try {
        // Get meeting id as string, no need to parse JSON
        const meetingRoom = await client.get(meetingId);
        return meetingRoom; // Return the raw string value
    } catch (error) {
        console.error('Error getting meeting room:', error);
        return null;
    }
}

export { redisMeetingRoom, redisGetMeetingRoom, client };