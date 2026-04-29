import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const ProjectOverview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [employeeRole, setEmployeeRole] = useState(null);

  const {
    projectId,
    projectName,
    projectType,
    status,
    projectTab,
    statusHistory,
  } = location.state || {};

  const activetab = location.pathname
    .split("/")
    .pop()
    ?.replace(/^\w/, (c) => c.toUpperCase());

  const tabClass =
    "px-[0.7vw] py-[0.3vw] rounded-full font-medium text-[0.8vw] transition-all";
  const activeClass = "bg-blue-600 text-white";
  const inactiveClass = "bg-gray-200 text-gray-600 hover:bg-gray-300";

  useEffect(() => {
    if (location.pathname.endsWith("projectOverview/")) {
      navigate("overview", {
        replace: true,
        state: {
          projectId,
          projectName,
          projectType,
          status,
          projectTab,
          statusHistory,
        },
      });
    }
  }, [
    location.pathname,
    navigate,
    projectId,
    projectName,
    projectType,
    status,
  ]);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setEmployeeRole(user.designation);
    }
  }, []);

  const getProjectsPath = (designation) => {
    if (designation === "Software Developer")
      return "/softwareDeveloper/projects";
    if (designation === "UI/UX") return "/designer/projects";
    if (designation === "3D") return "/threeD/projects";
    if (designation === "Project Head") return "/projectHead/projects";
    if (designation === "Admin") return "/admin/project";
    return "/projects";
  };

  return (
    <div className="p-[0.3vw] text-black">
      <div className="text-[0.85vw] text-gray-500 ">
        <span
          onClick={() => navigate(getProjectsPath(employeeRole))}
          className="cursor-pointer hover:text-[#3B82F6]"
        >
          Projects
        </span>
        <span className="m-[0.3vw]">{"/"}</span>
        <span
          className="cursor-pointer hover:text-[#3B82F6]"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("closeAddTask"));
          }}
        >
          {projectName || "Unnamed Project"}
        </span>
        <span className="m-[0.3vw]">{"/"}</span>
        <span className="text-[#3B82F6]">{activetab}</span>
      </div>

      <div className=" relative flex space-x-[0.5vw] mt-[0.5vw] mb-[0.5vw] bg-white p-[0.4vw] rounded-full w-fit">
        <NavLink
          to={`overview`}
          state={{ projectId, projectName }}
          end
          className={({ isActive }) =>
            `${tabClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to={`resources`}
          state={{ projectId, projectName }}
          className={({ isActive }) =>
            `${tabClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Resources
        </NavLink>
      </div>

      <div className="overflow-y-auto h-[80vh] pr-[0.3vw]">
        <Outlet />
      </div>
    </div>
  );
};

export default ProjectOverview;
