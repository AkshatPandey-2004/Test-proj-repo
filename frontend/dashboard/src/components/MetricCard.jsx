import React from "react";

const MetricCard = ({ title, value, icon: Icon, color }) => {
  const colorMap = {
    blue: "bg-blue-100 text-blue-600 border-t-4 border-blue-500",
    green: "bg-green-100 text-green-600 border-t-4 border-green-500",
    orange: "bg-orange-100 text-orange-600 border-t-4 border-orange-500",
    purple: "bg-purple-100 text-purple-600 border-t-4 border-purple-500",
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-md p-6 flex justify-between items-center hover:shadow-lg transition-all duration-200 ${colorMap[color]}`}
    >
      <div>
        <h3 className="text-sm text-gray-500">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className={`${colorMap[color]} bg-opacity-20 p-3 rounded-full`}>
        <Icon size={28} className={`${colorMap[color].split(" ")[1]}`} />
      </div>
    </div>
  );
};

export default MetricCard;
