"use client";

import { useState, useEffect } from "react";
import { Job } from "@unihood/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch jobs from API
    setLoading(false);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Job Board</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="border rounded p-4">
              <h3 className="font-semibold text-lg">{job.title}</h3>
              <p className="text-gray-600">{job.company_name}</p>
              <p className="text-sm text-gray-500">{job.location}</p>
              <p className="mt-2">{job.description}</p>
              <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
