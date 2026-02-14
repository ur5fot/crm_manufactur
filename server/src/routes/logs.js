import { loadLogs } from "../store.js";

export function registerLogRoutes(app) {
  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await loadLogs();
      // Sort descending (newest first)
      logs.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });
      res.json({ logs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
