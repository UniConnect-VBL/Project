"use client";

import { useState, useEffect } from "react";
import { Event } from "@unihood/types";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch events from API
    setLoading(false);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Events</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div key={event.id} className="border rounded p-4">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-gray-600">{event.description}</p>
              <p className="text-sm text-gray-500">
                {new Date(event.start_time).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{event.location}</p>
              <p className="text-lg font-bold mt-2">{event.ticket_price} VND</p>
              <button className="mt-4 bg-purple-500 text-white px-4 py-2 rounded">
                Buy Ticket
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
