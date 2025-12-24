"use client";

import { useState, useEffect } from "react";
import { Stream } from "@unihood/types";

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch live streams from API
    setLoading(false);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Live Streams</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streams.map((stream) => (
            <div key={stream.id} className="border rounded p-4">
              <h3 className="font-semibold">{stream.title}</h3>
              {/* TODO: Embed YouTube Live iframe */}
              <div className="mt-4 bg-gray-200 h-64 flex items-center justify-center">
                YouTube Live Embed
              </div>
              <button className="mt-4 bg-red-500 text-white px-4 py-2 rounded">
                Donate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
