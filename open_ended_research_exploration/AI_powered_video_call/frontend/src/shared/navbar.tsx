import { useNavigate } from "react-router-dom";

const NavBar: React.FC  = () => {
  let navigate = useNavigate();


  return (
    <div className="p-4 pl-24 pr-24 flex justify-between items-center bg-custom-black text-white">
      <h2 onClick={() => navigate("/dashboard")} className="cursor-pointer">
        APP NAME
      </h2>
      <div className="flex gap-12">
      </div>
    </div>
  );
};
export default NavBar;
