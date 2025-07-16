import { GetMeetingID } from "./meeting";
import { addMediaStream } from "./sdp";

const initializeConnection = async (meetingId: string, hostNameInBrowser: string) => {
    try {
      const response:any = await GetMeetingID(meetingId);
      const data = JSON.parse(response.meetingRoom);
      
      console.log('Meeting data:', data, 'Host in browser:', hostNameInBrowser);
      return data.name;

      // Get media stream and set it to video element
      const stream = await addMediaStream();
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Only create offer if we're the host and haven't created one yet
      if (data.name === hostNameInBrowser && !offer) {
        console.log("Creating offer as host");
        await createOffer(meetingId);
      }
    } catch (error) {
      console.error("Error in initializeConnection:", error);
    }
  };

  export default initializeConnection;