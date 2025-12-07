import React from 'react';
import { Database } from 'lucide-react';
import MetricPill from './MetricPill';

const RDSCard = ({ database }) => {
  const getStatusColor = (status) => {
    if (status === 'available') return 'green';
    if (status === 'stopped') return 'red';
    return 'yellow';
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 transition duration-300 hover:shadow-2xl">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Database className="text-blue-600" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 truncate" title={database.identifier}>
          {database.identifier}
        </h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">{database.engine}</p>

      <MetricPill
        label="Status"
        value={database.status.toUpperCase()}
        color={getStatusColor(database.status)}
      />

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Instance Class:</span>
          <span className="font-medium text-gray-700">{database.instanceClass}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Storage:</span>
          <span className="font-medium text-gray-700">{database.storage}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">CPU:</span>
          <span className="font-medium text-gray-700">{database.metrics.cpuUtilization}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Connections:</span>
          <span className="font-medium text-gray-700">{database.metrics.connections}</span>
        </div>
      </div>
    </div>
  );
};

export default RDSCard;