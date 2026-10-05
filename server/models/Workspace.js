const mongoose = require('mongoose');

const TabSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: '' },
    favIconUrl: { type: String, default: '' },
    pinned: { type: Boolean, default: false },
    scrollPosition: { type: Number, default: 0 },
    category: { type: String, default: 'Uncategorized' },
  },
  { _id: false }
);

const WorkspaceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    tabs: { type: [TabSchema], default: [] },
    categories: { type: [String], default: [] },
    source: { type: String, enum: ['manual', 'extension'], default: 'extension' },
    restoreCount: { type: Number, default: 0 },
    lastRestoredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

WorkspaceSchema.index({ user: 1, name: 'text', 'tabs.title': 'text', 'tabs.url': 'text' });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
