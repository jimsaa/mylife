import { Router } from 'express';
import {
  archiveProject,
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  updateProject,
} from '../services/projectService.js';
import { setSetting } from '../services/settingsService.js';

const router = Router();

router.get('/', (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  res.json(getProjects(includeArchived));
});

router.put('/settings/weekly-focus/:id', (req, res) => {
  setSetting('weekly_focus_project_id', req.params.id);
  res.json({ weekly_focus_project_id: req.params.id });
});

router.get('/:id', (req, res) => {
  const project = getProjectById(parseInt(req.params.id, 10));
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

router.post('/', (req, res) => {
  if (!req.body.name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  res.status(201).json(createProject(req.body));
});

router.put('/:id', (req, res) => {
  const project = updateProject(parseInt(req.params.id, 10), req.body);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

router.post('/:id/archive', (req, res) => {
  const project = archiveProject(parseInt(req.params.id, 10));
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

router.delete('/:id', (req, res) => {
  const ok = deleteProject(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.status(204).send();
});

export default router;
