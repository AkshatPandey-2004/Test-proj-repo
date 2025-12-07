import React from 'react';
import { Zap } from 'lucide-react';

const LambdaCard = ({ func }) => {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 transition duration-300 hover:shadow-2xl">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Zap className="text-orange-600" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 truncate" title={func.name}>
          {func.name}
        </h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">{func.runtime}</p>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Memory:</span>
          <span className="font-medium text-gray-700">{func.memorySize} MB</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Timeout:</span>
          <span className="font-medium text-gray-700">{func.timeout}s</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Invocations (24h):</span>
          <span className="font-medium text-gray-700">{func.metrics.invocations}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Errors (24h):</span>
          <span className="font-medium text-red-600">{func.metrics.errors}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Avg Duration:</span>
          <span className="font-medium text-gray-700">{func.metrics.avgDuration}</span>
        </div>
      </div>
    </div>
  );
};

export default LambdaCard;