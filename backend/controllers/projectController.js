const { dbRun, dbGet, dbAll } = require('../config/database');

exports.createProject = async (req, res) => {
  try {
    const { name, description, technology } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const result = await dbRun(
      'INSERT INTO projects (user_id, project_name, description, technology) VALUES (?, ?, ?, ?)',
      [userId, name, description || '', technology || '']
    );

    const projectId = result.lastID;
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);

    // Initialize blank generated_plans record
    await dbRun('INSERT INTO generated_plans (project_id, roadmap, tasks, documents) VALUES (?, ?, ?, ?)', [
      projectId,
      JSON.stringify({}),
      JSON.stringify([]),
      JSON.stringify({})
    ]);

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error creating project.' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error retrieving projects.' });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await dbGet('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const plans = await dbGet('SELECT * FROM generated_plans WHERE project_id = ?', [id]);
    const history = await dbAll('SELECT * FROM chat_history WHERE project_id = ? ORDER BY timestamp ASC', [id]);

    res.json({
      project,
      plans: plans ? {
        roadmap: JSON.parse(plans.roadmap || '{}'),
        tasks: JSON.parse(plans.tasks || '[]'),
        documents: JSON.parse(plans.documents || '{}')
      } : { roadmap: {}, tasks: [], documents: {} },
      chatHistory: history || []
    });
  } catch (error) {
    console.error('Get project detail error:', error);
    res.status(500).json({ error: 'Server error loading project details.' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await dbGet('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await dbRun('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error deleting project.' });
  }
};
