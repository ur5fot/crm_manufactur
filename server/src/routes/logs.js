import { loadLogs } from "../store.js";
import { validatePagination } from "../utils.js";

export function registerLogRoutes(app) {
  app.get("/api/logs", async (req, res) => {
    try {
      const { offset, limit } = validatePagination(req.query.offset, req.query.limit);
      const logs = await loadLogs();
      // Сортировка по убыванию (новые сначала)
      logs.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });
      const total = logs.length;
      const paginated = logs.slice(offset, offset + limit);
      res.json({ logs: paginated, total });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
