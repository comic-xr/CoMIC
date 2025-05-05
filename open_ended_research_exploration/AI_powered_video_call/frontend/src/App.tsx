import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { PRIMARY } from "./constants/colors";
import Error from "./pages/error";
import HomePage from "./pages/home";
import MeetingPage from "./pages/meeting";

PRIMARY
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/meeting/:meetingId" Component={MeetingPage} />
        <Route path="/" Component={HomePage} />
        <Route path="*" Component={Error} />
      </Routes>
    </Router>
  );
}

export default App;
