const express = require('express');
const Workspace = require('../models/Workspace');
const requireAuth = require('../middleware/auth');
const { classifyTabs } = require('../services/aiClassifier');

const router = express.Router();
router.use(requireAuth);

// Extension calls this with raw captured tabs; AI classifies and a workspace is created.
router.post('/capture', async (req, res) => {
  try {
    const { tabs, name } = req.body;
    if (!Array.isArray(tabs) || tabs.length === 0) {
      return res.status(400).json({ error: 'tabs array is required' });
    }

    const classified = await classifyTabs(tabs);

    const workspace = new Workspace({
      user: req.userId,
      name: name || classified.workspaceName,
      tabs: classified.tabs,
      categories: classified.categories,
      source: 'extension',
    });
    await workspace.save();

    res.status(201).json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to capture and classify tabs' });
  }
});

// List / search workspaces
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { user: req.userId };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { 'tabs.title': { $regex: q, $options: 'i' } },
        { 'tabs.url': { $regex: q, $options: 'i' } },
      ];
    }
    const workspaces = await Workspace.find(filter).sort({ updatedAt: -1 });
    res.json(workspaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ _id: req.params.id, user: req.userId });
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, tabs = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const workspace = new Workspace({
      user: req.userId,
      name,
      tabs,
      categories: [...new Set(tabs.map((t) => t.category).filter(Boolean))],
      source: 'manual',
    });
    await workspace.save();
    res.status(201).json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, tabs } = req.body;
    const update = {};
    if (name) update.name = name;
    if (tabs) update.tabs = tabs;

    const workspace = await Workspace.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      update,
      { new: true }
    );
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Marks a restore event (called when the extension reopens all tabs for a workspace)
router.post('/:id/restore', async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $inc: { restoreCount: 1 }, $set: { lastRestoredAt: new Date() } },
      { new: true }
    );
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore workspace' });
  }
});

module.exports = router;
