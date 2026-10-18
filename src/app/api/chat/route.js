import { google } from '@ai-sdk/google';
import { streamText, generateText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import User from '@/models/User';
import Organization from '@/models/Organization';
import Comment from '@/models/Comment';
import Doc from '@/models/Doc';
import ChatConversation from '@/models/ChatConversation';
import ChatMemory from '@/models/ChatMemory';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { isProjectMember, isTaskProjectMember } from '@/lib/rbac';

// Escapes text so it is matched literally inside a RegExp.
const escapeRe = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const COMPRESS_THRESHOLD = 40; // Compress when messages exceed this
const KEEP_RECENT = 15; // Keep this many recent messages after compression
const MAX_MEMORIES = 50; // Cap total stored memories

export const maxDuration = 60;

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, orgId } = await req.json();

    // Fetch workspace context once per request
    await dbConnect();

    // Get the specific organization (scoped to selected workspace)
    const orgQuery = orgId 
      ? { _id: orgId, 'members.user': session.userId }
      : { 'members.user': session.userId };
    const org = await Organization.findOne(orgQuery)
      .populate('members.user', 'name email avatar');

    if (!org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), { status: 404 });
    }

    const orgName = org.name;
    const orgMembers = org.members?.filter(m => m.user && m.status !== 'suspended') || [];

    // Get projects ONLY in this workspace
    const projects = await Project.find({
      organization: org._id,
      $or: [{ createdBy: session.userId }, { 'members.user': session.userId }]
    }).select('_id name status columns members').populate('members.user', 'name email');

    // Build member directory for the system prompt
    const roleDisplayMap = { owner: 'Owner', admin: 'Admin', manager: 'Manager', member: 'Member', guest: 'Guest' };
    const memberDirectory = orgMembers.map(m => {
      const u = m.user;
      const displayRole = roleDisplayMap[m.role] || m.role;
      return `- ${u.name || u.email} (email: ${u.email}, id: ${u._id}, role: ${displayRole})`;
    }).join('\n');

    // Build project directory for the system prompt
    const projectDirectory = projects.map(p => {
      const cols = p.columns?.map(c => c.id).join(', ') || 'todo, in-progress, done';
      return `- "${p.name}" (id: ${p._id}, status: ${p.status}, columns: [${cols}], members: ${p.members?.length || 0})`;
    }).join('\n');

    const today = new Date().toISOString().split('T')[0]; // e.g. 2026-05-13

    // ===== LOAD AI MEMORY =====
    let memoryContext = '';
    try {
      const memory = await ChatMemory.findOne({ userId: session.userId, orgId: org._id }).lean();
      if (memory) {
        const facts = memory.memories || [];
        if (facts.length > 0 || memory.summary) {
          const highFacts = facts.filter(f => f.importance === 'high').map(f => `- ${f.fact}`).join('\n');
          const medFacts = facts.filter(f => f.importance === 'medium').map(f => `- ${f.fact}`).join('\n');
          const prefFacts = facts.filter(f => f.category === 'preference').map(f => `- ${f.fact}`).join('\n');
          const decisionFacts = facts.filter(f => f.category === 'decision').map(f => `- ${f.fact}`).join('\n');

          memoryContext = `\n## Your Memory (from past conversations)\nYou remember these important things about this user and workspace:\n`;
          if (memory.summary) {
            memoryContext += `\n### Conversation History Summary\n${memory.summary}\n`;
          }
          if (prefFacts) {
            memoryContext += `\n### User Preferences\n${prefFacts}\n`;
          }
          if (decisionFacts) {
            memoryContext += `\n### Key Decisions Made\n${decisionFacts}\n`;
          }
          if (highFacts) {
            memoryContext += `\n### Important Context\n${highFacts}\n`;
          }
          if (medFacts && !highFacts) {
            memoryContext += `\n### Additional Context\n${medFacts}\n`;
          }
          memoryContext += `\nUse this memory to give consistent, personalized responses. Reference past decisions when relevant.\n`;
        }
      }
    } catch (memErr) {
      console.error('[Chat] Failed to load memory:', memErr.message);
    }

    const systemPrompt = `You are a senior AI Project Manager embedded in "${orgName}". You think like a PM — you don't just take orders, you proactively recommend, suggest, and fill in the gaps.

## Your Identity
- You are the PM assistant for "${orgName}"
- Current user: ${session.name || session.email} (id: ${session.userId}, email: ${session.email})
- Today's date: ${today}

## Team Directory
${memberDirectory || 'No team members found.'}

## Projects
${projectDirectory || 'No projects yet.'}

## Your PM Philosophy
You are NOT a form. You are a thinking project manager. When a user asks you to do something:
1. **Figure it out yourself** — Use your expertise to fill in details the user didn't specify
2. **Recommend, don't ask** — Suggest the best option, don't ask "what priority?"
3. **Be decisive** — Make smart choices and present them for confirmation
4. **One confirmation** — Present your complete plan ONCE, then execute on approval

## Task Creation Intelligence
When a user says something like "create a task for landing page design":

**YOU figure out:**
- **Description**: Write a professional, detailed description based on the task title and project context (2-3 sentences covering scope and deliverables)
- **Priority**: Infer from task type. MUST be exactly one of: low, medium, high, urgent (lowercase only). Design/UX = medium. Bug fixes = high. New features = medium. Infrastructure/security = high. Documentation = low.
- **Due Date**: Estimate based on complexity. Simple tasks (copy, labels) = 1-2 days. Medium tasks (single page, API endpoint) = 3-5 days. Complex tasks (full feature, multi-page) = 7-14 days. Calculate from today (${today}).
- **Assignee**: If the user mentions someone, match them. If the task type matches a team member's likely skill (design tasks → designers, code tasks → developers), suggest them. If unclear, suggest the user themselves.
- **Column**: Default to "todo" unless the user says otherwise
- **Labels**: Suggest relevant labels based on task type (e.g. "design", "frontend", "bug", "feature", "documentation")

**Then present a single confirmation like:**
> 🎯 Here's what I'll create:
> - **Task**: [title]
> - **Project**: [project name]
> - **Description**: [your generated description]
> - **Priority**: [your recommendation] — [brief reason]
> - **Due Date**: [calculated date] ([X days from now])
> - **Assignee**: [recommendation]
> - **Labels**: [suggestions]
>
> Shall I go ahead? (or tell me what to change)

When the user says "yes", "go ahead", "create it", "done", "confirm", or similar — **immediately execute** using the createTask tool with ALL the fields filled in. Do NOT ask more questions.

## Proactive PM Behavior
- **Suggest related tasks**: After creating a task, suggest 2-3 follow-up tasks that typically come next (e.g., after "Design Landing Page" → "Implement Landing Page", "Write Landing Page Copy", "QA Landing Page")
- **Flag risks**: If a due date seems too tight for the task complexity, mention it
- **Workload awareness**: If assigning to someone, check their current task count and mention if they're overloaded
- **Status recommendations**: When asked about project progress, give actionable insights, not just data dumps
- **Sprint planning**: When asked to plan work, suggest task breakdowns with priorities and estimates

## Capabilities
1. **View & Create Projects** — list projects, create new ones with custom columns
2. **Manage Tasks** — create, update, assign, change status/priority/due dates
3. **Assign Team Members** — assign tasks to anyone in the team directory by name or email
4. **Track Progress** — view task details, see what's in progress, what's overdue
5. **Team Visibility** — see who's on the team, their roles, and what they're working on
6. **Write Documentation** — create rich, well-structured docs within any project

## Documentation Writing
When asked to write docs, research notes, guides, or any knowledge content:
- Write in **rich Markdown** format with clear headings, bullet points, code blocks, tables, and callouts
- Structure like a professional blog/article: title, introduction, sections with headers, key takeaways
- Make it readable and visually engaging — use bold, italics, blockquotes, numbered lists
- Include practical examples, code snippets, or diagrams where relevant
- For research topics: cover background, key findings, pros/cons, recommendations
- For technical docs: include setup instructions, API references, architecture overviews
- For guides: step-by-step instructions with clear sections
- ALWAYS create the doc in the relevant project using the createDoc tool — do NOT just paste text in chat

## Important Rules
- You are ONLY operating within the "${orgName}" workspace
- Use tools proactively to fetch data before answering questions
- When the user mentions a person's name, match it against the team directory
- When the user mentions a project name, match it against the project list
- Be concise but thorough. Use bullet points and formatting for clarity.
- If something fails, explain what went wrong clearly
- DO NOT make up data — always use tools to get real data
- NEVER ask the user what today's date is. You already know it: ${today}
- NEVER ask "what priority?" or "what due date?" — suggest one yourself
- When the user confirms, EXECUTE IMMEDIATELY with all fields. No more questions.
${memoryContext}`;

    const result = streamText({
      model: google('gemini-flash-latest'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      // Enable Gemini 2.5 "thinking" and stream the thought summaries to the UI
      // so the user can watch the assistant reason before it acts.
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 2048,
            includeThoughts: true,
          },
        },
      },
      onFinish: async ({ response }) => {
        try {
          // Build the full messages to save: user messages + assistant response
          const allMessages = [
            ...messages.map(m => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : '',
              parts: m.parts,
            })),
            {
              role: 'assistant',
              content: response.messages?.map(m => 
                m.content?.filter(c => c.type === 'text').map(c => c.text).join('')
              ).join('') || '',
              parts: response.messages?.flatMap(m => m.content) || [],
            }
          ];

          await ChatConversation.findOneAndUpdate(
            { userId: session.userId, orgId: org._id },
            {
              userId: session.userId,
              orgId: org._id,
              messages: allMessages,
              updatedAt: new Date(),
              title: messages[0]?.content?.slice?.(0, 50) || 'Chat',
            },
            { upsert: true, new: true }
          );
          console.log('[Chat] Saved conversation to DB');

          // ===== AUTO-COMPRESSION =====
          if (allMessages.length > COMPRESS_THRESHOLD) {
            console.log(`[Chat] Messages (${allMessages.length}) exceed threshold (${COMPRESS_THRESHOLD}). Compressing...`);
            try {
              // Extract text from older messages for analysis
              const messagesToCompress = allMessages.slice(0, allMessages.length - KEEP_RECENT);
              const recentMessages = allMessages.slice(-KEEP_RECENT);

              const conversationText = messagesToCompress.map(m => {
                const text = m.content || m.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '';
                return `${m.role}: ${text}`;
              }).filter(t => t.length > 10).join('\n');

              if (conversationText.length > 100) {
                // Use Gemini to extract key facts
                const extractionResult = await generateText({
                  model: google('gemini-flash-latest'),
                  prompt: `Analyze this project management conversation and extract the most important information to remember. Be concise and specific.

Conversation:
${conversationText.substring(0, 8000)}

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "memories": [
    { "fact": "specific fact to remember", "category": "preference|decision|context|task_pattern", "importance": "high|medium|low" }
  ],
  "summary": "2-3 sentence summary of what was discussed and accomplished"
}

Focus on:
- User preferences (how they like to work, default priorities, assignment patterns)
- Key decisions made about projects or architecture
- Important project context (what projects are about, their status)
- Task patterns (common requests, workflows)

Extract at most 10 key facts. Be specific, not vague.`,
                });

                // Parse the extraction
                let extracted = { memories: [], summary: '' };
                try {
                  const rawText = extractionResult.text.trim();
                  // Strip markdown code fences if present
                  const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
                  extracted = JSON.parse(jsonText);
                } catch (parseErr) {
                  console.error('[Chat] Failed to parse extraction:', parseErr.message);
                }

                if (extracted.memories?.length > 0 || extracted.summary) {
                  // Load existing memory
                  const existingMemory = await ChatMemory.findOne({ userId: session.userId, orgId: org._id });
                  
                  let mergedMemories = existingMemory?.memories || [];
                  let mergedSummary = extracted.summary || existingMemory?.summary || '';

                  // Add new memories, avoiding exact duplicates
                  const existingFacts = new Set(mergedMemories.map(m => m.fact.toLowerCase()));
                  for (const newMem of (extracted.memories || [])) {
                    if (!existingFacts.has(newMem.fact.toLowerCase())) {
                      mergedMemories.push({
                        fact: newMem.fact,
                        category: newMem.category || 'context',
                        importance: newMem.importance || 'medium',
                        createdAt: new Date(),
                      });
                    }
                  }

                  // Cap memories — keep most important ones
                  if (mergedMemories.length > MAX_MEMORIES) {
                    const importanceOrder = { high: 0, medium: 1, low: 2 };
                    mergedMemories.sort((a, b) => 
                      (importanceOrder[a.importance] || 2) - (importanceOrder[b.importance] || 2)
                    );
                    mergedMemories = mergedMemories.slice(0, MAX_MEMORIES);
                  }

                  // If existing summary, merge with new
                  if (existingMemory?.summary && extracted.summary) {
                    // Use a simple merge — new summary appends context
                    mergedSummary = `${existingMemory.summary} ${extracted.summary}`.slice(0, 2000);
                  }

                  // Save memory
                  await ChatMemory.findOneAndUpdate(
                    { userId: session.userId, orgId: org._id },
                    {
                      userId: session.userId,
                      orgId: org._id,
                      memories: mergedMemories,
                      summary: mergedSummary,
                      lastCompressedAt: new Date(),
                      $inc: { compressionCount: 1 },
                    },
                    { upsert: true, new: true }
                  );
                  console.log(`[Chat] Memory saved: ${extracted.memories?.length || 0} new facts, summary updated`);
                }

                // Trim conversation to keep only recent messages
                // Add a system marker so the AI knows context was compressed
                const compressedMessages = [
                  {
                    role: 'assistant',
                    content: '[Previous conversation was summarized and saved to memory. I remember the key context and decisions from our earlier discussion.]',
                    parts: [{ type: 'text', text: '[Previous conversation was summarized and saved to memory. I remember the key context and decisions from our earlier discussion.]' }],
                  },
                  ...recentMessages
                ];

                await ChatConversation.findOneAndUpdate(
                  { userId: session.userId, orgId: org._id },
                  { messages: compressedMessages, updatedAt: new Date() }
                );
                console.log(`[Chat] Compressed: ${allMessages.length} → ${compressedMessages.length} messages`);
              }
            } catch (compressErr) {
              console.error('[Chat] Compression failed (non-blocking):', compressErr.message);
            }
          }
        } catch (err) {
          console.error('[Chat] Failed to save history:', err.message);
        }
      },
      tools: {
        // ===== PROJECT TOOLS =====
        getProjects: tool({
          description: `Get all projects in the "${orgName}" workspace.`,
          parameters: z.object({}),
          execute: async () => {
            await dbConnect();
            const projects = await Project.find({
              organization: org._id,
              $or: [{ createdBy: session.userId }, { 'members.user': session.userId }]
            }).select('_id name description status visibility members columns createdAt');

            // Get task counts per project
            const projectIds = projects.map(p => p._id);
            const taskCounts = await Task.aggregate([
              { $match: { project: { $in: projectIds } } },
              { $group: { _id: { project: '$project', status: '$columnId' }, count: { $sum: 1 } } }
            ]);

            return projects.map(p => {
              const counts = taskCounts.filter(tc => tc._id.project.toString() === p._id.toString());
              const total = counts.reduce((sum, c) => sum + c.count, 0);
              const done = counts.filter(c => c._id.status === 'done').reduce((sum, c) => sum + c.count, 0);
              return {
                id: p._id,
                name: p.name,
                description: p.description,
                status: p.status,
                memberCount: p.members?.length || 0,
                totalTasks: total,
                completedTasks: done,
                columns: p.columns?.map(c => ({ id: c.id, name: c.name })) || [],
              };
            });
          },
        }),

        createProject: tool({
          description: 'Create a new project in the workspace.',
          parameters: z.object({
            name: z.string().describe('The name of the project.'),
            description: z.string().optional().describe('A brief description.'),
            visibility: z.enum(['team', 'private']).optional().describe('Project visibility.'),
          }),
          execute: async ({ name, description, visibility }) => {
            await dbConnect();
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const project = await Project.create({
              name,
              description,
              slug,
              organization: org?._id,
              visibility: visibility || 'team',
              members: [{ user: session.userId, role: 'owner', addedBy: session.userId }],
              createdBy: session.userId,
              columns: [
                { id: 'backlog', name: 'Backlog', color: '#64748b', order: 0 },
                { id: 'todo', name: 'To Do', color: '#3b82f6', order: 1 },
                { id: 'in-progress', name: 'In Progress', color: '#eab308', order: 2 },
                { id: 'review', name: 'Review', color: '#a855f7', order: 3 },
                { id: 'done', name: 'Done', color: '#22c55e', order: 4 },
              ]
            });
            return { success: true, projectId: project._id, name: project.name };
          },
        }),

        getProjectDetails: tool({
          description: 'Get full details of a specific project including members, columns, and task breakdown.',
          parameters: z.object({
            projectId: z.string().describe('The project ID'),
          }),
          execute: async ({ projectId }) => {
            if (!(await isProjectMember(String(projectId), String(session.userId)))) return { error: 'Project not found' };
            await dbConnect();
            const project = await Project.findById(projectId)
              .populate('members.user', 'name email avatar');

            if (!project) return { error: 'Project not found' };

            const tasks = await Task.find({ project: projectId })
              .populate('assignee', 'name email')
              .select('title columnId priority assignee dueDate status');

            const columns = project.columns || [];
            const tasksByColumn = {};
            columns.forEach(c => {
              tasksByColumn[c.name || c.id] = tasks.filter(t => t.columnId === c.id).map(t => ({
                id: t._id,
                title: t.title,
                priority: t.priority,
                assignee: t.assignee?.name || 'Unassigned',
                dueDate: t.dueDate,
              }));
            });

            return {
              name: project.name,
              description: project.description,
              status: project.status,
              members: project.members?.map(m => ({
                name: m.user?.name || m.user?.email,
                email: m.user?.email,
                role: m.role,
                id: m.user?._id,
              })) || [],
              columns: columns.map(c => ({ id: c.id, name: c.name })),
              tasksByColumn,
              totalTasks: tasks.length,
            };
          },
        }),

        // ===== TEAM TOOLS =====
        getTeamMembers: tool({
          description: 'Get all team members in the workspace with their roles and contact info.',
          parameters: z.object({}),
          execute: async () => {
            await dbConnect();
            const organization = await Organization.findOne({
              'members.user': session.userId
            }).populate('members.user', 'name email avatar');

            if (!organization) return { error: 'No organization found' };

            // Get task count per member
            const memberIds = organization.members.map(m => m.user?._id).filter(Boolean);
            const taskCounts = await Task.aggregate([
              { $match: { assignee: { $in: memberIds }, columnId: { $ne: 'done' } } },
              { $group: { _id: '$assignee', count: { $sum: 1 } } }
            ]);
            const countMap = {};
            taskCounts.forEach(tc => { countMap[tc._id.toString()] = tc.count; });

            return organization.members
              .filter(m => m.user)
              .map(m => ({
                id: m.user._id,
                name: m.user.name || 'Unknown',
                email: m.user.email,
                role: m.role,
                status: m.status,
                activeTasks: countMap[m.user._id.toString()] || 0,
              }));
          },
        }),

        // ===== TASK TOOLS =====
        getTasks: tool({
          description: 'Get tasks for a specific project, optionally filtered by status/column, priority, or assignee.',
          parameters: z.object({
            projectId: z.string().describe('The project ID to fetch tasks for.'),
            columnId: z.string().optional().describe('Filter by column/status (e.g., todo, in-progress, review, done)'),
            priority: z.string().optional().describe('Filter by priority (urgent, high, medium, low)'),
            assigneeEmail: z.string().optional().describe('Filter by assignee email'),
          }),
          execute: async ({ projectId, columnId, priority, assigneeEmail }) => {
            if (!(await isProjectMember(String(projectId), String(session.userId)))) return { error: 'Project not found' };
            await dbConnect();
            const query = { project: projectId };
            if (columnId) query.columnId = columnId;
            if (priority) query.priority = priority;

            if (assigneeEmail) {
              const assigneeUser = await User.findOne({ email: assigneeEmail, organizations: org._id });
              if (assigneeUser) query.assignee = assigneeUser._id;
            }

            const tasks = await Task.find(query)
              .populate('assignee', 'name email')
              .populate('assignees', 'name email')
              .select('_id title columnId priority dueDate assignee assignees subtasks labels estimatedHours loggedHours')
              .sort({ order: 1, createdAt: -1 });

            return tasks.map(t => ({
              id: t._id,
              title: t.title,
              status: t.columnId,
              priority: t.priority,
              assignee: t.assignee?.name || 'Unassigned',
              additionalAssignees: t.assignees?.map(a => a.name) || [],
              dueDate: t.dueDate,
              subtasksTotal: t.subtasks?.length || 0,
              subtasksDone: t.subtasks?.filter(s => s.completed).length || 0,
              labels: t.labels || [],
              estimatedHours: t.estimatedHours,
              loggedHours: t.loggedHours,
            }));
          },
        }),

        createTask: tool({
          description: 'Create a new task in a project. ALWAYS fill in description, priority, assignee, and dueDate when the user provides them. Do not leave optional fields empty if the user mentioned them.',
          parameters: z.object({
            projectId: z.string().optional().describe('The project ID (MongoDB ObjectId). Optional if projectName is provided.'),
            projectName: z.string().optional().describe('The project name to find. Used if projectId is not available.'),
            title: z.string().describe('The task title.'),
            description: z.string().optional().describe('Task description.'),
            priority: z.string().optional().describe('Priority: low, medium, high, or urgent (lowercase)'),
            columnId: z.string().optional().describe('Column/status (default: todo)'),
            assigneeName: z.string().optional().describe('Name or email of the person to assign this task to.'),
            dueDate: z.string().optional().describe('Due date in ISO format (e.g., 2026-05-20)'),
            labels: z.array(z.string()).optional().describe('Labels/tags for the task'),
          }),
          execute: async ({ projectId, projectName, title, description, priority, columnId, assigneeName, dueDate, labels }) => {
            try {
              await dbConnect();

              // Resolve project — by ID first, then by name within the org
              let project = null;
              if (projectId && projectId !== 'undefined') {
                project = await Project.findOne({ _id: projectId, organization: org._id, 'members.user': session.userId });
              }
              if (!project && projectName) {
                project = await Project.findOne({
                  organization: org._id,
                  'members.user': session.userId,
                  name: { $regex: new RegExp(`^${projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                });
              }
              if (!project) {
                const available = await Project.find({ organization: org._id, 'members.user': session.userId }).select('name _id').lean();
                const list = available.map(p => `"${p.name}" (id: ${p._id})`).join(', ');
                return { error: `Project not found. Available projects: ${list || 'None'}` };
              }

              let assigneeId = null;
              let assigneeInfo = null;

              if (assigneeName) {
                let user = await User.findOne({ email: assigneeName.toLowerCase(), organizations: org._id });
                if (!user) {
                  user = await User.findOne({ name: { $regex: new RegExp(escapeRe(assigneeName), 'i') }, organizations: org._id });
                }
                if (user) {
                  assigneeId = user._id;
                  assigneeInfo = user.name || user.email;
                }
              }

              const normalizedPriority = (priority || 'medium').toLowerCase();
              const validPriorities = ['low', 'medium', 'high', 'urgent'];

              const task = await Task.create({
                title,
                description,
                project: project._id,
                priority: validPriorities.includes(normalizedPriority) ? normalizedPriority : 'medium',
                columnId: columnId || 'todo',
                assignee: assigneeId,
                reporter: session.userId,
                createdBy: session.userId,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                labels: labels || [],
              });

              // Notify assignee
              if (assigneeId && assigneeId.toString() !== session.userId) {
                try {
                  await createNotification({
                    recipientId: assigneeId,
                    type: 'task_assigned',
                    title: 'New Task Assigned',
                    message: `You've been assigned to "${title}"`,
                    link: `/dashboard/projects/${project._id}`,
                    actorId: session.userId,
                  });
                } catch (e) { /* notification failure shouldn't block */ }
              }

              return {
                success: true,
                taskId: task._id,
                title: task.title,
                projectName: project.name,
                assignedTo: assigneeInfo || 'Unassigned',
                column: columnId || 'todo',
                priority: priority || 'medium',
              };
            } catch (err) {
              console.error('createTask error:', err.message);
              return { error: `Task creation failed: ${err.message}` };
            }
          },
        }),

        getTaskDetails: tool({
          description: 'Get full details of a specific task including subtasks, comments, and activity.',
          parameters: z.object({
            taskId: z.string().describe('The task ID to get details for.'),
          }),
          execute: async ({ taskId }) => {
            if (!(await isTaskProjectMember(String(taskId), String(session.userId)))) return { error: 'Task not found' };
            await dbConnect();
            const task = await Task.findById(taskId)
              .populate('assignee', 'name email')
              .populate('assignees', 'name email')
              .populate('reporter', 'name email')
              .populate('createdBy', 'name email');

            if (!task) return { error: 'Task not found' };

            const comments = await Comment.find({ task: taskId })
              .populate('author', 'name email')
              .sort({ createdAt: -1 })
              .limit(10);

            return {
              id: task._id,
              title: task.title,
              description: task.description,
              status: task.columnId,
              priority: task.priority,
              assignee: task.assignee ? { name: task.assignee.name, email: task.assignee.email } : null,
              additionalAssignees: task.assignees?.map(a => ({ name: a.name, email: a.email })) || [],
              reporter: task.reporter ? { name: task.reporter.name, email: task.reporter.email } : null,
              dueDate: task.dueDate,
              startDate: task.startDate,
              estimatedHours: task.estimatedHours,
              loggedHours: task.loggedHours,
              subtasks: task.subtasks?.map(s => ({ title: s.title, completed: s.completed })) || [],
              attachmentCount: task.attachments?.length || 0,
              labels: task.labels || [],
              commentCount: comments.length,
              recentComments: comments.slice(0, 5).map(c => ({
                author: c.author?.name || 'Unknown',
                content: c.content?.substring(0, 200),
                date: c.createdAt,
              })),
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
            };
          },
        }),

        updateTask: tool({
          description: 'Update a task — change priority, due date, description, labels, estimated hours, or title.',
          parameters: z.object({
            taskId: z.string().describe('The task ID to update.'),
            title: z.string().optional().describe('New title'),
            description: z.string().optional().describe('New description'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            dueDate: z.string().optional().describe('New due date in ISO format'),
            labels: z.array(z.string()).optional(),
            estimatedHours: z.number().optional(),
          }),
          execute: async ({ taskId, ...updates }) => {
            if (!(await isTaskProjectMember(String(taskId), String(session.userId)))) return { error: 'Task not found' };
            await dbConnect();
            const cleanUpdates = {};
            Object.entries(updates).forEach(([k, v]) => {
              if (v !== undefined && v !== null) {
                if (k === 'dueDate') cleanUpdates[k] = new Date(v);
                else cleanUpdates[k] = v;
              }
            });

            const task = await Task.findByIdAndUpdate(taskId, cleanUpdates, { new: true })
              .populate('assignee', 'name email');

            if (!task) return { error: 'Task not found' };

            return {
              success: true,
              taskId: task._id,
              title: task.title,
              updated: Object.keys(cleanUpdates),
            };
          },
        }),

        updateTaskStatus: tool({
          description: 'Move a task to a different column/status (e.g., todo → in-progress → review → done).',
          parameters: z.object({
            taskId: z.string().describe('The task ID to move.'),
            newColumnId: z.string().describe('The target column ID (e.g., todo, in-progress, review, done)'),
          }),
          execute: async ({ taskId, newColumnId }) => {
            if (!(await isTaskProjectMember(String(taskId), String(session.userId)))) return { error: 'Task not found' };
            await dbConnect();
            const task = await Task.findById(taskId)
              .populate('assignee', 'name email')
              .populate('reporter', 'name email');

            if (!task) return { error: 'Task not found' };

            const oldStatus = task.columnId;
            task.columnId = newColumnId;
            task.status = newColumnId;
            await task.save();

            // Send notifications based on status change
            try {
              if (newColumnId === 'review' && task.reporter) {
                await createNotification({
                  recipientId: task.reporter._id,
                  type: 'task_review',
                  title: 'Task Ready for Review',
                  message: `"${task.title}" has been moved to Review`,
                  link: `/dashboard/projects/${task.project}`,
                  actorId: session.userId,
                });
              }
              if (newColumnId === 'done') {
                const notifyUsers = [task.reporter?._id, task.assignee?._id].filter(Boolean);
                for (const userId of notifyUsers) {
                  if (userId.toString() !== session.userId) {
                    await createNotification({
                      recipientId: userId,
                      type: 'task_completed',
                      title: 'Task Completed',
                      message: `"${task.title}" has been marked as Done`,
                      link: `/dashboard/projects/${task.project}`,
                      actorId: session.userId,
                    });
                  }
                }
              }
            } catch (e) { /* notification failure shouldn't block */ }

            return {
              success: true,
              taskId: task._id,
              title: task.title,
              from: oldStatus,
              to: newColumnId,
            };
          },
        }),

        assignTask: tool({
          description: 'Assign or reassign a task to a team member (primary assignee).',
          parameters: z.object({
            taskId: z.string().describe('The task ID.'),
            assigneeName: z.string().describe('Name or email of the person to assign.'),
          }),
          execute: async ({ taskId, assigneeName }) => {
            if (!(await isTaskProjectMember(String(taskId), String(session.userId)))) return { error: 'Task not found' };
            await dbConnect();

            // Find the user
            let user = await User.findOne({ email: assigneeName.toLowerCase(), organizations: org._id });
            if (!user) {
              user = await User.findOne({ name: { $regex: new RegExp(escapeRe(assigneeName), 'i') }, organizations: org._id });
            }
            if (!user) return { error: `Could not find team member "${assigneeName}"` };

            const task = await Task.findByIdAndUpdate(
              taskId,
              { assignee: user._id },
              { new: true }
            );

            if (!task) return { error: 'Task not found' };

            // Notify the assignee
            if (user._id.toString() !== session.userId) {
              try {
                await createNotification({
                  recipientId: user._id,
                  type: 'task_assigned',
                  title: 'Task Assigned to You',
                  message: `You've been assigned to "${task.title}"`,
                  link: `/dashboard/projects/${task.project}`,
                  actorId: session.userId,
                });
              } catch (e) { /* notification failure shouldn't block */ }
            }

            return {
              success: true,
              taskId: task._id,
              title: task.title,
              assignedTo: user.name || user.email,
            };
          },
        }),

        addAssignees: tool({
          description: 'Add additional assignees/collaborators to a task (in addition to the primary assignee).',
          parameters: z.object({
            taskId: z.string().describe('The task ID.'),
            assigneeNames: z.array(z.string()).describe('Names or emails of people to add as additional assignees.'),
          }),
          execute: async ({ taskId, assigneeNames }) => {
            if (!(await isTaskProjectMember(String(taskId), String(session.userId)))) return { error: 'Task not found' };
            await dbConnect();

            const userIds = [];
            const addedNames = [];
            const notFound = [];

            for (const name of assigneeNames) {
              let user = await User.findOne({ email: name.toLowerCase(), organizations: org._id });
              if (!user) {
                user = await User.findOne({ name: { $regex: new RegExp(escapeRe(name), 'i') }, organizations: org._id });
              }
              if (user) {
                userIds.push(user._id);
                addedNames.push(user.name || user.email);
              } else {
                notFound.push(name);
              }
            }

            if (userIds.length === 0) {
              return { error: `Could not find any of the specified team members: ${notFound.join(', ')}` };
            }

            const task = await Task.findByIdAndUpdate(
              taskId,
              { $addToSet: { assignees: { $each: userIds } } },
              { new: true }
            );

            if (!task) return { error: 'Task not found' };

            // Notify new assignees
            for (const userId of userIds) {
              if (userId.toString() !== session.userId) {
                try {
                  await createNotification({
                    recipientId: userId,
                    type: 'task_assigned',
                    title: 'Added to Task',
                    message: `You've been added as a collaborator on "${task.title}"`,
                    link: `/dashboard/projects/${task.project}`,
                    actorId: session.userId,
                  });
                } catch (e) { /* notification failure shouldn't block */ }
              }
            }

            return {
              success: true,
              taskId: task._id,
              title: task.title,
              addedAssignees: addedNames,
              notFound: notFound.length > 0 ? notFound : undefined,
            };
          },
        }),

        getDocs: tool({
          description: 'List all documents in a project.',
          parameters: z.object({
            projectId: z.string().optional().describe('The project ID.'),
            projectName: z.string().optional().describe('The project name.'),
          }),
          execute: async ({ projectId, projectName }) => {
            try {
              await dbConnect();
              let project = null;
              if (projectId && projectId !== 'undefined') {
                project = await Project.findOne({ _id: projectId, organization: org._id, 'members.user': session.userId });
              }
              if (!project && projectName) {
                project = await Project.findOne({
                  organization: org._id,
                  'members.user': session.userId,
                  name: { $regex: new RegExp(`^${projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                });
              }
              if (!project) return { error: 'Project not found.' };

              const docs = await Doc.find({ project: project._id })
                .populate('createdBy', 'name email')
                .sort({ updatedAt: -1 })
                .lean();

              return {
                projectName: project.name,
                totalDocs: docs.length,
                docs: docs.map(d => ({
                  id: d._id,
                  title: d.title,
                  createdBy: d.createdBy?.name || 'Unknown',
                  updatedAt: d.updatedAt,
                  contentPreview: d.content?.substring(0, 150) || 'Empty',
                })),
              };
            } catch (err) {
              return { error: `Failed to get docs: ${err.message}` };
            }
          },
        }),

        createDoc: tool({
          description: 'Create a rich documentation page in a project. Use this for writing guides, research notes, technical docs, meeting notes, architecture overviews, or any knowledge content. Content should be well-structured Markdown with headers, lists, code blocks, tables, and formatting.',
          parameters: z.object({
            projectId: z.string().optional().describe('The project ID.'),
            projectName: z.string().optional().describe('The project name.'),
            title: z.string().describe('The document title.'),
            content: z.string().describe('The full document content in rich Markdown format. Use headers (##), bullet points, bold, code blocks, tables, blockquotes, etc. Make it comprehensive and well-structured like a professional article or guide.'),
          }),
          execute: async ({ projectId, projectName, title, content }) => {
            try {
              await dbConnect();
              let project = null;
              if (projectId && projectId !== 'undefined') {
                project = await Project.findOne({ _id: projectId, organization: org._id, 'members.user': session.userId });
              }
              if (!project && projectName) {
                project = await Project.findOne({
                  organization: org._id,
                  'members.user': session.userId,
                  name: { $regex: new RegExp(`^${projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                });
              }
              if (!project) {
                const available = await Project.find({ organization: org._id, 'members.user': session.userId }).select('name _id').lean();
                const list = available.map(p => `"${p.name}" (id: ${p._id})`).join(', ');
                return { error: `Project not found. Available: ${list || 'None'}` };
              }

              const doc = await Doc.create({
                title,
                content,
                project: project._id,
                createdBy: session.userId,
                lastEditedBy: session.userId,
              });

              return {
                success: true,
                docId: doc._id,
                title: doc.title,
                projectName: project.name,
                contentLength: content.length,
                viewUrl: `/dashboard/projects/${project._id}/docs`,
              };
            } catch (err) {
              console.error('createDoc error:', err.message);
              return { error: `Doc creation failed: ${err.message}` };
            }
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
