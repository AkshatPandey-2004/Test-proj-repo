import React from 'react';
import { Database, AlertCircle } from 'lucide-react';

const S3Card = ({ bucket }) => {
  const hasData = bucket.sizeDisplay !== 'N/A' && bucket.numberOfObjects !== 'N/A' && bucket.numberOfObjects !== '0';
  
  return (
    <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 transition duration-300 hover:shadow-2xl">
      <div className="flex items-center space-x-3 mb-3">
        <div className={`p-2 ${hasData ? 'bg-green-100' : 'bg-gray-100'} rounded-lg`}>
          <Database className={hasData ? 'text-green-600' : 'text-gray-400'} size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 truncate flex-1" title={bucket.name}>
          {bucket.name}
        </h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="font-medium text-gray-700">{bucket.creationDate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Objects:</span>
          <span className={`font-medium ${bucket.numberOfObjects === 'N/A' || bucket.numberOfObjects === '0' ? 'text-gray-400' : 'text-gray-700'}`}>
            {bucket.numberOfObjects === '0' ? 'Empty' : bucket.numberOfObjects}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Size:</span>
          <span className={`font-medium ${bucket.sizeDisplay === 'N/A' || bucket.sizeDisplay === '0 Bytes' ? 'text-gray-400' : 'text-gray-700'}`}>
            {bucket.sizeDisplay === '0 Bytes' ? 'Empty' : bucket.sizeDisplay}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Region:</span>
          <span className="font-medium text-gray-700">{bucket.region}</span>
        </div>

        {!hasData && bucket.numberOfObjects === '0' && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database size={14} className="text-blue-600" />
              <span className="text-xs text-blue-700">Empty bucket</span>
            </div>
          </div>
        )}

        {bucket.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{bucket.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default S3Card;