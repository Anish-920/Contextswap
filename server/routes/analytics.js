const express = require('express');
const Workspace = require('../models/Workspace');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Summary stats + category breakdown + most-restored workspaces for the dashboard.
router.get('/summary', async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.userId });

    const totalWorkspaces = workspaces.length;
    const totalTabs = workspaces.reduce((sum, w) => sum + w.tabs.length, 0);
    const totalRestores = workspaces.reduce((sum, w) => sum + (w.restoreCount || 0), 0);

    const categoryCounts = {};
    workspaces.forEach((w) => {
      w.tabs.forEach((t) => {
        const cat = t.category || 'Uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    const topWorkspaces = [...workspaces]
      .sort((a, b) => (b.restoreCount || 0) - (a.restoreCount || 0))
      .slice(0, 5)
      .map((w) => ({ id: w._id, name: w.name, restoreCount: w.restoreCount, tabCount: w.tabs.length }));

    const recentActivity = [...workspaces]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 8)
      .map((w) => ({ id: w._id, name: w.name, updatedAt: w.updatedAt, tabCount: w.tabs.length }));

    res.json({
      totalWorkspaces,
      totalTabs,
      totalRestores,
      avgTabsPerWorkspace: totalWorkspaces ? +(totalTabs / totalWorkspaces).toFixed(1) : 0,
      categoryCounts,
      topWorkspaces,
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

module.exports = router;
