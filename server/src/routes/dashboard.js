import {
  getDashboardStats,
  getDashboardEvents,
  getDocumentExpiryEvents,
  getDocumentOverdueEvents,
  getBirthdayEvents,
  getRetirementEvents,
  loadConfig,
  syncAllStatusEvents
} from "../store.js";

/**
 * Register dashboard and configuration routes
 * @param {Express.Application} app - Express app instance
 */
export function registerDashboardRoutes(app) {
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/dashboard/events", async (_req, res) => {
    try {
      // Auto-activate/expire status events for all employees before returning dashboard data
      await syncAllStatusEvents();
      const events = await getDashboardEvents();
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/document-expiry", async (_req, res) => {
    try {
      const events = await getDocumentExpiryEvents();
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/document-overdue", async (_req, res) => {
    try {
      const events = await getDocumentOverdueEvents();
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/birthday-events", async (_req, res) => {
    try {
      const events = await getBirthdayEvents();
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/retirement-events", async (_req, res) => {
    try {
      const config = await loadConfig();
      const retirementAge = parseInt(config.retirement_age_years || 60, 10);
      const events = await getRetirementEvents(retirementAge);
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/config", async (_req, res) => {
    try {
      const config = await loadConfig();
      res.json(config);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
