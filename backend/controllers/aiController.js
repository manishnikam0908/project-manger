const fs = require('fs');
const path = require('path');
const { dbRun, dbGet, dbAll } = require('../config/database');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

// Helper to sleep for a specified duration
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to make call to Gemini API with retry logic for transient errors
async function callGemini(contents, systemInstruction = '', responseMimeType = 'text/plain') {
  if (!API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  
  const body = {
    contents,
    generationConfig: {
      temperature: 0.7
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseMimeType === 'application/json') {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const maxAttempts = 4;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[AI CONTROLLER] Calling Gemini API (gemini-2.5-flash) - Attempt ${attempt}/${maxAttempts}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;

        // If transient error (503 Service Unavailable / 429 Too Many Requests), wait and retry
        if ((status === 503 || status === 429) && attempt < maxAttempts) {
          const delay = attempt * 3000; // Exponential backoff: 3s, 6s, 9s
          console.warn(`[AI CONTROLLER] Transient Gemini error ${status}. Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        throw new Error(`Gemini API Error (Status ${status}): ${errorText}`);
      }

      const data = await response.json();
      try {
        return data.candidates[0].content.parts[0].text;
      } catch (err) {
        console.error('[AI CONTROLLER] Error parsing Gemini response:', JSON.stringify(data));
        throw new Error('Failed to retrieve response from Gemini candidates.');
      }
    } catch (error) {
      lastError = error;
      console.error(`[AI CONTROLLER] Error on attempt ${attempt}:`, error.message);
      
      const isTransient = error.message.includes('Status 503') || error.message.includes('Status 429');
      
      // If it is a generic network/fetch error, treat as transient and retry with a short delay
      if (!isTransient && attempt < maxAttempts) {
        const delay = attempt * 2000;
        console.warn(`[AI CONTROLLER] Network connection error. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      if (!isTransient) {
        break; // terminal non-transient error
      }
    }
  }

  throw lastError || new Error('Failed to communicate with Gemini API.');
}

// 1. Analyze Project
exports.analyzeProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const prompt = `
      Analyze this project and generate a structured JSON overview.
      Project Name: "${project.project_name}"
      Description: "${project.description}"
      Technology preference: "${project.technology || 'None specified'}"

      Your output MUST be a valid JSON object matching this structure exactly (do not wrap in markdown tags like \`\`\`json, just pure raw JSON):
      {
        "summary": "High level description of what the project does",
        "targetUsers": ["User Type 1", "User Type 2"],
        "requiredFeatures": [
          { "name": "Feature Name", "description": "Short description", "complexity": "Low/Medium/High" }
        ],
        "complexityLevel": "Overall Complexity (Beginner, Intermediate, Advanced)",
        "recommendedTechnology": {
          "frontend": "Suggestions for Frontend",
          "backend": "Suggestions for Backend",
          "database": "Suggestions for Database",
          "other": ["Auth suggest", "Deploy suggest", "Hosting suggest"]
        },
        "possibleChallenges": ["Challenge 1", "Challenge 2"]
      }
    `;

    const systemInstruction = 'You are the Planner Agent. Analyze project proposals and respond ONLY with raw, valid JSON.';
    const responseText = await callGemini(
      [{ parts: [{ text: prompt }] }],
      systemInstruction,
      'application/json'
    );

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText.trim());
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON output directly. Attempting to clean text.', parseError);
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    // Save summary to database plans under documents or description
    const currentPlans = await dbGet('SELECT * FROM generated_plans WHERE project_id = ?', [projectId]);
    let docObj = {};
    if (currentPlans && currentPlans.documents) {
      try { docObj = JSON.parse(currentPlans.documents); } catch (e) {}
    }
    docObj.analysis = parsedResult;

    await dbRun('UPDATE generated_plans SET documents = ? WHERE project_id = ?', [
      JSON.stringify(docObj),
      projectId
    ]);

    // Also update project description and tech if they were empty
    if (!project.description && parsedResult.summary) {
      await dbRun('UPDATE projects SET description = ? WHERE id = ?', [parsedResult.summary, projectId]);
    }

    res.json(parsedResult);
  } catch (error) {
    console.error('Project analysis error:', error);
    res.status(500).json({ error: error.message || 'Server error during AI analysis.' });
  }
};

// 2. Generate Roadmap
exports.generateRoadmap = async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const prompt = `
      Create a step-by-step development roadmap for this project.
      Project Name: "${project.project_name}"
      Description: "${project.description}"
      Technology: "${project.technology || 'Any'}"

      Output a JSON object containing a "phases" list. Each phase should be a development stage (e.g., Planning, Design, Development, Testing, Deployment).
      Include standard tasks within each phase.
      Respond ONLY with valid JSON structure matching:
      {
        "phases": [
          {
            "id": 1,
            "title": "Phase 1: Planning & Setup",
            "description": "Short explanation of goals",
            "tasks": [
              { "id": "task_1_1", "name": "Task name 1", "description": "Detailed description of this specific step", "status": "pending" }
            ]
          }
        ]
      }
    `;

    const systemInstruction = 'You are the Planner Agent. Respond ONLY with valid, raw JSON containing the project roadmap phases and tasks.';
    const responseText = await callGemini(
      [{ parts: [{ text: prompt }] }],
      systemInstruction,
      'application/json'
    );

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText.trim());
    } catch (e) {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    // Save roadmap and initial tasks list to database
    // Extract flattened tasks list
    const tasksList = [];
    parsedResult.phases.forEach(phase => {
      phase.tasks.forEach(t => {
        tasksList.push({
          id: t.id,
          phaseId: phase.id,
          phaseTitle: phase.title,
          name: t.name,
          description: t.description,
          status: 'todo' // todo, in-progress, completed
        });
      });
    });

    await dbRun('UPDATE generated_plans SET roadmap = ?, tasks = ? WHERE project_id = ?', [
      JSON.stringify(parsedResult),
      JSON.stringify(tasksList),
      projectId
    ]);

    res.json({ roadmap: parsedResult, tasks: tasksList });
  } catch (error) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({ error: error.message || 'Server error generating roadmap.' });
  }
};

// 3. Task Breakdown System (Convert feature to sub-tasks)
exports.breakdownFeature = async (req, res) => {
  try {
    const { projectId, featureName } = req.body;
    if (!projectId || !featureName) {
      return res.status(400).json({ error: 'Project ID and feature name are required.' });
    }

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const prompt = `
      For the project "${project.project_name}" using stack "${project.technology}", 
      break down the following feature into small, actionable, individual development tasks.
      Feature to break down: "${featureName}"

      Respond with a JSON array of tasks matching this format:
      [
        { "name": "Task 1 Name", "description": "Technical instructions on what to write/configure" },
        { "name": "Task 2 Name", "description": "Technical instructions" }
      ]
    `;

    const systemInstruction = 'You are the Developer Agent. Break down features into actionable developer tasks in JSON format.';
    const responseText = await callGemini(
      [{ parts: [{ text: prompt }] }],
      systemInstruction,
      'application/json'
    );

    let tasks;
    try {
      tasks = JSON.parse(responseText.trim());
    } catch (e) {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      tasks = JSON.parse(cleanJson);
    }

    res.json(tasks);
  } catch (error) {
    console.error('Feature breakdown error:', error);
    res.status(500).json({ error: error.message || 'Server error breaking down feature.' });
  }
};

// 4. Main Chat with Project Memory & Agent Select
exports.chat = async (req, res) => {
  try {
    const { projectId, message, agent } = req.body;
    if (!projectId || !message) {
      return res.status(400).json({ error: 'Project ID and message are required.' });
    }

    // Retrieve active project details
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Retrieve past chat history to inject into Gemini context (Memory)
    const historyRows = await dbAll(
      'SELECT role, message FROM chat_history WHERE project_id = ? ORDER BY timestamp DESC LIMIT 10',
      [projectId]
    );
    // Reverse rows to put them in chronological order
    const recentHistory = historyRows.reverse();

    // Map history to Gemini format
    const contents = recentHistory.map(row => ({
      role: row.role === 'user' ? 'user' : 'model',
      parts: [{ text: row.message }]
    }));

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Determine agent's identity and setup system instruction
    let systemInstruction = `You are ProjectMentor AI, an expert software developer and engineering mentor guiding the user on their project.
    Active Project Name: "${project.project_name}"
    Project Context/Description: "${project.description}"
    Technology Stack: "${project.technology || 'Flexible / undecided'}"
    `;

    if (agent === 'planner') {
      systemInstruction += `\nROLE: You are the Planner Agent. Focus on high-level planning, requirements gathering, roadmaps, task estimations, and user flow architectures. Keep advice structural and structured.`;
    } else if (agent === 'developer') {
      systemInstruction += `\nROLE: You are the Developer Agent. Focus on coding, system architecture, database design, directory organization, syntax troubleshooting, and debugging backend/frontend API logic. Provide code snippets where helpful.`;
    } else if (agent === 'tester') {
      systemInstruction += `\nROLE: You are the Tester Agent. Focus on writing unit/integration test cases, detecting potential logical bugs, security auditing (XSS, SQL Injection, Auth bypasses), and performance benchmarking. Suggest testing scripts.`;
    } else if (agent === 'documentation') {
      systemInstruction += `\nROLE: You are the Documentation Agent. Focus on formatting clean, developer-friendly Markdown README files, API contract tables, user guides, and deployment checklists.`;
    }

    // Call Gemini
    const aiResponseText = await callGemini(contents, systemInstruction);

    // Save message history to DB
    await dbRun(
      'INSERT INTO chat_history (project_id, role, agent, message) VALUES (?, ?, ?, ?)',
      [projectId, 'user', agent || 'developer', message]
    );
    await dbRun(
      'INSERT INTO chat_history (project_id, role, agent, message) VALUES (?, ?, ?, ?)',
      [projectId, 'assistant', agent || 'developer', aiResponseText]
    );

    res.json({
      response: aiResponseText,
      agent: agent || 'developer'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Server error during chat.' });
  }
};

// 5. Code Review Assistant
exports.reviewCode = async (req, res) => {
  try {
    const { code, language, projectId } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code content is required.' });
    }

    const projectContext = projectId 
      ? await dbGet('SELECT * FROM projects WHERE id = ?', [projectId])
      : null;

    const contextText = projectContext 
      ? `Active project is: "${projectContext.project_name}" using "${projectContext.technology}".` 
      : '';

    const prompt = `
      You are an expert Senior Code Reviewer. Audit the following ${language || 'source code'} code.
      ${contextText}
      
      Code to review:
      \`\`\`
      ${code}
      \`\`\`

      Analyze for:
      1. Potential bugs and logical errors
      2. Security vulnerabilities (insecure endpoints, inputs, secrets leakage)
      3. Performance bottlenecks or unnecessary operations
      4. Quality, structure, and suggestions for improvements

      Provide a structured JSON output with the review findings:
      {
        "overallScore": "Score out of 100",
        "summary": "Brief summary review",
        "bugs": [{ "line": 12, "issue": "Logical error detail", "fix": "How to resolve" }],
        "security": [{ "issue": "Security vulnerability name", "severity": "High/Medium/Low", "description": "Detail", "fix": "Remediation" }],
        "optimizations": [{ "issue": "Performance bottleneck", "suggestion": "Refactoring tip" }],
        "improvedCode": "Refactored, clean version of the code that implements all the fixes and suggestions."
      }
    `;

    const systemInstruction = 'You are the Tester Agent. You perform detailed code reviews and output raw JSON reports.';
    const responseText = await callGemini(
      [{ parts: [{ text: prompt }] }],
      systemInstruction,
      'application/json'
    );

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText.trim());
    } catch (e) {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    res.json(parsedResult);
  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({ error: error.message || 'Server error during code review.' });
  }
};

// 6. File Upload & Analysis
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;

    let contentToAnalyze = '';
    let imageBase64 = null;

    // Check if image
    if (mimeType.startsWith('image/')) {
      const imgBuffer = fs.readFileSync(filePath);
      imageBase64 = imgBuffer.toString('base64');
    } else {
      // Treat as text / code file (PDF and Docx could be read if we had specific libraries, 
      // but since we want standard JS, we'll read text directly. Let's do a fallback for text)
      try {
        contentToAnalyze = fs.readFileSync(filePath, 'utf8');
      } catch (e) {
        return res.status(400).json({ error: 'Failed to read file as text. Only text-based source files (JS, PY, HTML, CSS, JSON, etc.) and images are supported.' });
      }
    }

    let contents = [];
    if (imageBase64) {
      contents = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            },
            {
              text: 'Analyze this image uploaded for the project. Extract all requirements, UI mockups, features, database models, or diagrams represented and format them as clear documentation.'
            }
          ]
        }
      ];
    } else {
      contents = [
        {
          role: 'user',
          parts: [
            {
              text: `Here is the contents of file "${originalName}":\n\n\`\`\`\n${contentToAnalyze}\n\`\`\`\n\nAnalyze this file, extract its features, architecture, coding patterns, requirements or suggestions for ProjectMentor.`
            }
          ]
        }
      ];
    }

    const systemInstruction = 'You are the Planner Agent. Extract software requirements and details from uploaded files.';
    const aiResponse = await callGemini(contents, systemInstruction);

    // Save this analysis as a chat message automatically so it is stored in history
    await dbRun(
      'INSERT INTO chat_history (project_id, role, agent, message) VALUES (?, ?, ?, ?)',
      [projectId, 'user', 'planner', `[Uploaded file: ${originalName}]`]
    );
    await dbRun(
      'INSERT INTO chat_history (project_id, role, agent, message) VALUES (?, ?, ?, ?)',
      [projectId, 'assistant', 'planner', `**File Analysis for ${originalName}**:\n\n${aiResponse}`]
    );

    // Delete temp file after reading
    fs.unlinkSync(filePath);

    res.json({
      message: 'File analyzed successfully.',
      analysis: aiResponse
    });
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: error.message || 'Server error during file analysis.' });
  }
};

// 7. Save Tasks List (Update checkmarks)
exports.saveTasks = async (req, res) => {
  try {
    const { projectId, tasks } = req.body;
    if (!projectId || !tasks) {
      return res.status(400).json({ error: 'Project ID and tasks array are required.' });
    }

    await dbRun('UPDATE generated_plans SET tasks = ? WHERE project_id = ?', [
      JSON.stringify(tasks),
      projectId
    ]);

    res.json({ message: 'Tasks updated successfully.' });
  } catch (error) {
    console.error('Save tasks error:', error);
    res.status(500).json({ error: 'Server error saving tasks.' });
  }
};

// 8. Documentation Exporter
exports.generateDoc = async (req, res) => {
  try {
    const { projectId, docType } = req.body; // docType: 'readme' | 'api' | 'architecture'
    if (!projectId || !docType) {
      return res.status(400).json({ error: 'Project ID and document type are required.' });
    }

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const history = await dbAll('SELECT role, message FROM chat_history WHERE project_id = ?', [projectId]);
    const plans = await dbGet('SELECT * FROM generated_plans WHERE project_id = ?', [projectId]);

    const contextSummary = `
      Project: "${project.project_name}"
      Description: "${project.description}"
      Stack: "${project.technology}"
      Roadmap: ${plans ? plans.roadmap : '{}'}
    `;

    let prompt = '';
    if (docType === 'readme') {
      prompt = `
        Generate a professional, fully complete Markdown README.md file for the project:
        ${contextSummary}
        
        The README should have:
        - Beautiful Title & Project Description
        - Comprehensive Features List
        - Tech Stack list with icons/names
        - Installation steps & Getting Started
        - Project folder structure
        - API overview
        - Author guidelines and License
      `;
    } else if (docType === 'api') {
      prompt = `
        Generate API documentation in clean Markdown for the project:
        ${contextSummary}
        
        The API docs should list all essential endpoints (e.g. Authentication, Project management, Core features) in markdown tables showing:
        - Method & Endpoint
        - Headers
        - Request Body (JSON)
        - Success Response (JSON)
        - Error Response (JSON)
      `;
    } else if (docType === 'architecture') {
      prompt = `
        Generate software architecture documentation for the project:
        ${contextSummary}
        
        Include:
        - High level System Architecture diagram (using simple ASCII or Mermaid layout)
        - Recommended Database schema / models details
        - Folder structures for Frontend and Backend
        - Component/Service layer relationships
      `;
    }

    const systemInstruction = 'You are the Documentation Agent. You generate clear, comprehensive documentation in Markdown format.';
    const docText = await callGemini([{ parts: [{ text: prompt }] }], systemInstruction);

    // Save documents to plans
    const docObj = plans && plans.documents ? JSON.parse(plans.documents) : {};
    docObj[docType] = docText;

    await dbRun('UPDATE generated_plans SET documents = ? WHERE project_id = ?', [
      JSON.stringify(docObj),
      projectId
    ]);

    res.json({ document: docText });
  } catch (error) {
    console.error('Doc generation error:', error);
    res.status(500).json({ error: error.message || 'Server error generating documentation.' });
  }
};
