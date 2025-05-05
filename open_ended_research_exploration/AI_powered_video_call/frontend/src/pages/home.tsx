import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Fade } from "@mui/material";
import { CreateMeetingID, GetMeetingID } from "../services/meeting";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [meetingId, setMeetingId] = useState("");
  useEffect(() => {
    console.log("login screen");
  }, []);

  const CreateMeeting = async () => {
    const data = await CreateMeetingID(name);
    localStorage.setItem("host", name); 
    console.log(data);
    navigate(`/meeting/${data.meetingId}`);
  }

  const JoinMeeting = async () => {
    localStorage.setItem("host", name); 
    navigate(`/meeting/${meetingId}`);
  }

  return (
    <div className="bg-custom-white">
      <Fade in={true} timeout={1000}>
        <div className="pl-24 pr-24 pt-12 h-screen text-custom-black">
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold mb-12 text-center">WebAI</h1>
            
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex flex-col gap-6">
                {/* Create Meeting Section */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold">Create New Meeting</h2>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="createName" className="text-sm font-medium">Your Name</label>
                    <input
                      type="text"
                      id="createName"
                      placeholder="Enter your name"
                      className="p-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <button className="py-3 px-6 rounded-md bg-primary text-white hover:bg-opacity-90 transition-all" onClick={() => {
                      CreateMeeting();
                  }}>
                    Create New Meeting
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <hr className="flex-1 border-gray-200" />
                  <span className="text-gray-500 text-sm">or</span>
                  <hr className="flex-1 border-gray-200" />
                </div>

                {/* Join Meeting Section */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold">Join Existing Meeting</h2>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="joinName" className="text-sm font-medium">Your Name</label>
                    <input
                      type="text"
                      id="joinName"
                      placeholder="Enter your name"
                      className="p-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="meetingId" className="text-sm font-medium">Meeting ID</label>
                    <input
                      type="text"
                      id="meetingId"
                      placeholder="Enter meeting ID"
                      className="p-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value)}
                      required
                    />
                  </div>
                  <button className="py-3 px-6 rounded-md bg-primary text-white hover:bg-opacity-90 transition-all" onClick={() => {
                    JoinMeeting();
                  }}>
                    Join Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Fade>
    </div>
  );
};

export default HomePage;
