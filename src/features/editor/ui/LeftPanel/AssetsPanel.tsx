"use client";

import { useAssetsStore } from "../../stores/assetsStore";

export function AssetsPanel() {
  const { assets } = useAssetsStore();

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Assets</h3>

      {assets.length === 0 ? (
        <p className="text-sm text-gray-500">
          No assets yet. Upload images to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => (
            <div key={asset.id} className="border border-gray-200 rounded p-2">
              {asset.type === "image" && (
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-20 object-cover rounded"
                />
              )}
              <p className="text-xs mt-1 truncate">{asset.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
