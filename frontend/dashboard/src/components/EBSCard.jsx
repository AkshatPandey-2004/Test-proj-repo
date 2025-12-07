import React from 'react';
import { HardDrive } from 'lucide-react';
import MetricPill from './MetricPill';

const EBSCard = ({ volume }) => {
  const getStateColor = (state) => {
    if (state === 'in-use') return 'green';
    if (state === 'available') return 'blue';
    return 'gray';
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 transition duration-300 hover:shadow-2xl">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <HardDrive className="text-purple-600" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 truncate" title={volume.volumeId}>
          {volume.volumeId}
        </h3>
      </div>

      <MetricPill
        label="State"
        value={volume.state.toUpperCase()}
        color={getStateColor(volume.state)}
      />

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Size:</span>
          <span className="font-medium text-gray-700">{volume.size}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Type:</span>
          <span className="font-medium text-gray-700">{volume.volumeType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Attached To:</span>
          <span className="font-medium text-gray-700 text-xs">{volume.attachedTo}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Read Ops:</span>
          <span className="font-medium text-gray-700">{volume.metrics.readOps}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Write Ops:</span>
          <span className="font-medium text-gray-700">{volume.metrics.writeOps}</span>
        </div>
      </div>
    </div>
  );
};

export default EBSCard;