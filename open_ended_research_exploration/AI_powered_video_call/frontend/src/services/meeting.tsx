interface MeetingResponse {
    meetingId: string;
    error?: string;
}

const GetMeetingID = async (meetingId: string): Promise<MeetingResponse> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/meeting/checkmeetingroom/${meetingId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching meeting:', error);
        return { meetingId: '', error: 'Failed to get meeting ID' };
    }
}

const CreateMeetingID = async (name: string): Promise<MeetingResponse> => {
    try {
        console.log('creating meeting room', name);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/meeting/createmeetingroom`, {
            method: 'POST',
            body: JSON.stringify({ name: name }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating meeting:', error);
        return { meetingId: '', error: 'Failed to create meeting' };
    }
}

export { GetMeetingID, CreateMeetingID };