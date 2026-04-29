import React from "react";
import { Outlet } from "react-router-dom";

const Marketing = () => {
  return (
    <div className="h-full">
      <Outlet />
    </div>
  );
};

export default Marketing;