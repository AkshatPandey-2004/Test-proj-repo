import React from "react";

const MetricPill = ({ label, value, color }) => {
  const colorMap = {
    orange: "bg-orange-100 text-orange-700 border-orange-300",
    blue: "bg-blue-100 text-blue-700 border-blue-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
  };

  return (
    <div
      className={`px-4 py-2 border rounded-full shadow-sm text-sm font-medium ${colorMap[color]} transition-all hover:shadow-md`}
    >
      {label}: <span className="font-semibold">{value}</span>
    </div>
  );
};

export default MetricPill;
