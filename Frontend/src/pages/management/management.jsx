import React from "react";
import { Outlet } from "react-router-dom";

const management = () => {
  return (
    <div className="h-full">
      <Outlet />
    </div>
  );
};

export default management;
