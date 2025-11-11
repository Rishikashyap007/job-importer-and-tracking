
"use client"
import React, { useEffect, useState } from "react";
import api from "./utils/api";

type Log = {
  _id: string;
  sourceUrl: string;
  totalFetched: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: number;
  runAt: string;
};

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch all import logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Log[]>("/import/logs");
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger import manually
  const handleImport = async () => {
    try {
      setLoading(true);
      await api.post("/import/start", {});
      alert("Import started successfully!");
      await fetchLogs();
    } catch (err) {
      console.error("Error starting import:", err);
      alert("Import failed!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Job Importer Dashboard
      </h1>

      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Import History</h2>
        <button
          onClick={handleImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Run Import Now
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-600">No import logs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 bg-white rounded-lg shadow">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 border">Feed URL</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">New</th>
                <th className="p-2 border">Updated</th>
                <th className="p-2 border">Failed</th>
                <th className="p-2 border">Run Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="hover:bg-gray-50 border-t text-center text-gray-700"
                >
                  <td className="p-2 border text-blue-600 text-left truncate max-w-md">
                    {log.sourceUrl}
                  </td>
                  <td className="p-2 border">{log.totalFetched}</td>
                  <td className="p-2 border text-green-600">{log.newJobs}</td>
                  <td className="p-2 border text-yellow-600">{log.updatedJobs}</td>
                  <td className="p-2 border text-red-600">{log.failedJobs}</td>
                  <td className="p-2 border">
                    {new Date(log.runAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
