import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DynamicProjectTimeline = ({ timelineData = [] }) => {
  const monthsToShow = 6;
  const [viewOffset, setViewOffset] = useState(0);

  const processedTimelineData = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return [];
    }

    return timelineData.map(month => {
      const total = month.completed + month.delayed;
      
      if (total === 0) {
        return {
          month: month.month,
          completed: 0,
          delayed: 0,
          completedActual: 0,
          delayedActual: 0
        };
      }

      const completedPercentage = Math.round((month.completed / total) * 100);
      const delayedPercentage = Math.round((month.delayed / total) * 100);
      
      const offset = Math.abs(completedPercentage - delayedPercentage) < 5 ? 2 : 0;
      
      return {
        month: month.month,
        completed: completedPercentage,
        delayed: delayedPercentage + offset, 
        completedActual: completedPercentage,
        delayedActual: delayedPercentage
      };
    });
  }, [timelineData]);

  const visibleData = useMemo(() => {
    const totalData = processedTimelineData.length;
    if (totalData === 0) return [];
    
    const startIndex = Math.max(0, totalData - monthsToShow - viewOffset);
    const endIndex = totalData - viewOffset;
    
    const sliced = processedTimelineData.slice(startIndex, endIndex);
    return sliced;
  }, [processedTimelineData, monthsToShow, viewOffset]);


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-[0.3vw] border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-700 text-[0.75vw] mb-[0.3vw]">{label}</p>
          <p className="text-green-600 text-[0.7vw]">
            Completed: {data.completedActual}%
          </p>
          <p className="text-yellow-600 text-[0.7vw]">
            Delayed: {data.delayedActual}%
          </p>
        </div>
      );
    }
    return null;
  };

  const canGoBack = viewOffset < processedTimelineData.length - monthsToShow;
  const canGoForward = viewOffset > 0;

  const goBack = () => {
    if (canGoBack) {
      setViewOffset((prev) => prev + monthsToShow);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      setViewOffset((prev) => Math.max(0, prev - monthsToShow));
    }
  };

  const goToPresent = () => {
    setViewOffset(0);
  };

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <p className="text-gray-500 text-[0.9vw]">No timeline data available</p>
      </div>
    );
  }

  const hasNonZeroData = timelineData.some(
    month => (Number(month.completed) || 0) > 0 || (Number(month.delayed) || 0) > 0
  );

  if (!hasNonZeroData) {
    return (
      <div className="w-full h-full bg-white">
        <div className="flex flex-col gap-[0.4vw] mb-[1vw]">
          <div className="flex justify-between">
            <h2 className="text-[1vw] font-normal">Project Timeline Summary</h2>

            <div className="flex items-center gap-[1vw]">
              <div className="flex items-center gap-2">
                <span className="w-[1vw] h-[0.3vw] bg-green-500 rounded"></span>
                <span className="text-[0.75vw] text-gray-700">Completed</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-[1vw] h-[0.3vw] bg-yellow-500 rounded"></span>
                <span className="text-[0.75vw] text-gray-700">Delayed</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <p className="text-gray-500 text-[0.9vw] font-medium">No completed or delayed projects yet</p>
            <p className="text-gray-400 text-[0.75vw] mt-2">Timeline will appear once projects are completed</p>
          </div>
        </div>
        <div className="mt-[0.4vw] grid grid-cols-2 gap-[0.8vw] text-center">
          <div className="p-[0.3vw] bg-green-50 rounded-lg">
            <div className="text-[1.2vw] font-bold text-green-500">0%</div>
            <div className="text-[0.7vw] text-gray-600">Completed</div>
          </div>
          <div className="p-[0.3vw] bg-yellow-50 rounded-lg">
            <div className="text-[1.2vw] font-bold text-yellow-500">0%</div>
            <div className="text-[0.7vw] text-gray-600">Delayed</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white">
      <div className="flex flex-col gap-[0.4vw] mb-[1vw]">
        <div className="flex justify-between">
          <h2 className="text-[1vw] font-normal">Project Timeline Summary</h2>

          <div className="flex items-center gap-[1vw]">
            <div className="flex items-center gap-2">
              <span className="w-[1vw] h-[0.3vw] bg-green-500 rounded"></span>
              <span className="text-[0.75vw] text-gray-700">Completed</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-[1vw] h-[0.3vw] bg-yellow-500 rounded"></span>
              <span className="text-[0.75vw] text-gray-700">Delayed</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <div className="text-[0.75vw] text-gray-600">
            {visibleData.length > 0 ? (
              <>
                Showing: {visibleData[0]?.month} - {visibleData[visibleData.length - 1]?.month}
                <span className="ml-4 text-[0.7vw] text-gray-500">
                  (Total: {processedTimelineData.length} months)
                </span>
              </>
            ) : (
              <span>No data to display</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={`p-[0.3vw] rounded-lg cursor-pointer ${
                canGoBack
                  ? "bg-blue-100 hover:bg-blue-200 text-blue-600"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-[0.8vw] h-[0.8vw]" />
            </button>

            <button
              onClick={goToPresent}
              className="px-[0.6vw] py-[0.2vw] text-[0.7vw] bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Current
            </button>

            <button
              onClick={goForward}
              disabled={!canGoForward}
              className={`p-[0.3vw] rounded-lg cursor-pointer ${
                canGoForward
                  ? "bg-blue-100 hover:bg-blue-200 text-blue-600"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-[0.8vw] h-[0.8vw]" />
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={visibleData}>
          <defs>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDelayed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

          <XAxis
            dataKey="month"
            tick={{ fill: "#6B7280", fontSize: "0.75vw" }}
            tickLine={false}
          />

          <YAxis
            ticks={[0, 25, 50, 75, 100]}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: "#6B7280", fontSize: "0.75vw" }}
            tickLine={false}
          />

          <Tooltip
            content={<CustomTooltip />}
          />

          <Area
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#colorCompleted)"
            dot={{ stroke: "#22C55E", strokeWidth: 2, r: 4, fill: "white" }}
            activeDot={{ r: 6 }}
            connectNulls={true}
            fillOpacity={0.6}
          />

          <Area
            type="monotone"
            dataKey="delayed"
            name="Delayed"
            stroke="#eab308"
            strokeWidth={2}
            fill="url(#colorDelayed)"
            dot={{ stroke: "#eab308", strokeWidth: 2, r: 4, fill: "white" }}
            activeDot={{ r: 6 }}
            connectNulls={true}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-[0.4vw] grid grid-cols-2 gap-[0.8vw] text-center">
        <div className="p-[0.3vw] bg-green-50 rounded-lg">
          <div className="text-[1.2vw] font-bold text-green-600">
            {Math.round(visibleData[visibleData.length - 1]?.completedActual || 0)}%
          </div>
          <div className="text-[0.7vw] text-gray-600">Completed</div>
        </div>
        <div className="p-[0.3vw] bg-yellow-50 rounded-lg">
          <div className="text-[1.2vw] font-bold text-yellow-500">
            {Math.round(visibleData[visibleData.length - 1]?.delayedActual || 0)}%
          </div>
          <div className="text-[0.7vw] text-gray-600">Delayed</div>
        </div>
      </div>
    </div>
  );
};

export default DynamicProjectTimeline;