import React from 'react';

const ServiceCostCard = ({ service, cost, percentage }) => {
  const getServiceIcon = (serviceName) => {
    if (serviceName.includes('EC2')) return '🖥️';
    if (serviceName.includes('S3')) return '📦';
    if (serviceName.includes('RDS')) return '🗄️';
    if (serviceName.includes('Lambda')) return '⚡';
    if (serviceName.includes('CloudWatch')) return '📊';
    if (serviceName.includes('VPC')) return '🌐';
    if (serviceName.includes('EBS')) return '💾';
    return '☁️';
  };

  const getBarColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct > 40) return 'bg-red-500';
    if (pct > 20) return 'bg-orange-500';
    if (pct > 10) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getServiceIcon(service)}</span>
          <span className="font-semibold text-gray-800 text-sm">{service}</span>
        </div>
        <span className="text-lg font-bold text-gray-800">${cost}</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getBarColor(percentage)} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium text-gray-600">{percentage}%</span>
      </div>
    </div>
  );
};

export default ServiceCostCard;