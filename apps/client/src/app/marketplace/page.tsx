"use client";

import { useState, useEffect } from "react";
import { Material } from "@unihood/types";

export default function MarketplacePage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch materials from API
    setLoading(false);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {materials.map((material) => (
            <div key={material.id} className="border rounded p-4">
              <h3 className="font-semibold">{material.title}</h3>
              <p className="text-gray-600">{material.description}</p>
              <p className="text-lg font-bold mt-2">{material.price} VND</p>
              <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
                Buy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
