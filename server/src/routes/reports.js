import {
  getStatusReport,
  getCustomReport,
  exportEmployees
} from "../store.js";

export function registerReportRoutes(app) {
  app.get("/api/reports/statuses", async (req, res) => {
    const type = req.query.type;
    if (type !== 'current' && type !== 'month') {
      res.status(400).json({ error: 'Query parameter "type" must be "current" or "month"' });
      return;
    }
    try {
      const report = await getStatusReport(type);
      res.json(report);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/custom", async (req, res) => {
    try {
      let filters = [];
      let columns = null;

      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters);
        } catch (err) {
          console.error('Invalid filters JSON:', err);
          res.status(400).json({ error: 'Invalid filters JSON' });
          return;
        }
      }

      if (req.query.columns) {
        try {
          columns = JSON.parse(req.query.columns);
        } catch (err) {
          console.error('Invalid columns JSON:', err);
          res.status(400).json({ error: 'Invalid columns JSON' });
          return;
        }
      }

      const results = await getCustomReport(filters, columns);
      res.json({ results });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      let filters = {};
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters);
        } catch (err) {
          console.error('Invalid filters JSON:', err);
          res.status(400).json({ error: 'Invalid filters JSON' });
          return;
        }
      }
      const searchTerm = req.query.search || '';
      const csvString = await exportEmployees(filters, searchTerm);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="employees_export.csv"');
      res.send(csvString);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
