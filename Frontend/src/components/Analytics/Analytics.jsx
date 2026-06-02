import React, { useState } from "react";
import Followup from "./Followup";

const Analytics = ({ employeeId: propEmployeeId = undefined }) => {
  return (
    <div className="w-full h-[81vh] flex flex-col gap-[1vh] text-black overflow-hidden">

      <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
        <Followup employeeId={propEmployeeId} />
      </div>
    </div>
  );
};

export default Analytics;