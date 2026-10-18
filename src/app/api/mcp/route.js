import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import Task from '@/models/Task';
import Doc from '@/models/Doc';
import McpUsage from '@/models/McpUsage';
import { generateSvgDiagram } from '@/lib/generateSvg';
import { isProjectMember, isTaskProjectMember } from '@/lib/rbac';

// CORS headers for hosted AI assistants (they call the connector from their own servers)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
};

// Where the upgrade links in limit messages point (this deployment's billing page).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const BILLING_URL = `${APP_URL}/dashboard/billing`;

// ─── Plan limits ──────────────────────────────────────────
const PLAN_LIMITS = {
  free:  { mcpCalls: 100,   label: 'Free',  next: 'Pro',  nextCalls: '1,000' },
  pro:   { mcpCalls: 1000,  label: 'Pro',   next: 'Team', nextCalls: 'unlimited' },
  team:  { mcpCalls: Infinity, label: 'Team', next: null,  nextCalls: null },
};

// Standard MCP error result — sets isError so the client/model treats it as a
// failed tool call rather than a successful answer.
const errorResult = (text) => ({ content: [{ type: 'text', text }], isError: true });

// ─── Auth helper ──────────────────────────────────────────
async function authenticateRequest(request) {
  // API key must arrive in the Authorization header — never a query param, so the
  // credential can't leak into access logs, browser history, or Referer headers.
  const auth = request.headers.get('authorization');
  const rawKey = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!rawKey) return null;
  await dbConnect();

  const apiKeyDoc = await ApiKey.findByKey(rawKey);
  if (!apiKeyDoc) return null;

  const user = await User.findById(apiKeyDoc.user);
  return user;
}

// ─── Plan resolution ──────────────────────────────────────
// Billing is per-user (User.subscription.plan); an organization's effective
// plan is its owner's subscription plan.
async function resolveOrgPlan(ownerId) {
  if (!ownerId) return 'free';
  const owner = await User.findById(ownerId).select('subscription.plan').lean();
  return owner?.subscription?.plan || 'free';
}

// ─── Usage check + increment ──────────────────────────────
// Returns { allowed: true } or { allowed: false, message: '...' }
async function checkAndIncrementUsage(user, orgId) {
  await dbConnect();
  // Membership-scoped lookup doubles as the access check (IDOR guard): a caller
  // can only spend usage on — and therefore act within — an org they belong to.
  const org = await Organization.findOne({
    _id: orgId,
    $or: [{ owner: user._id }, { 'members.user': user._id }],
  }).select('owner name').lean();
  if (!org) return { allowed: false, message: 'Organization not found or access denied.' };

  const plan = await resolveOrgPlan(org.owner);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Unlimited plan — skip counting
  if (limits.mcpCalls === Infinity) {
    await McpUsage.incrementCalls(orgId);
    return { allowed: true };
  }

  // Check current usage before incrementing
  const currentUsage = await McpUsage.getCurrentUsage(orgId);

  if (currentUsage >= limits.mcpCalls) {
    const upgradeUrl = BILLING_URL;
    return {
      allowed: false,
      message: `⚠️ You've reached your ${limits.label} plan limit of ${limits.mcpCalls.toLocaleString()} MCP calls this month.\n\n` +
        `Your organization "${org.name}" has used ${currentUsage.toLocaleString()} / ${limits.mcpCalls.toLocaleString()} calls.\n\n` +
        `🚀 Upgrade to ${limits.next} for ${limits.nextCalls} MCP calls/month → ${upgradeUrl}`
    };
  }

  // Under limit — increment and allow
  await McpUsage.incrementCalls(orgId);
  return { allowed: true };
}

// Wraps a tool handler with usage limit checking
// orgExtractor is a function that extracts orgId from the tool args
function withUsageLimit(user, orgExtractor, handler) {
  return async (args) => {
    const orgId = orgExtractor(args);
    if (orgId) {
      const usage = await checkAndIncrementUsage(user, orgId);
      if (!usage.allowed) {
        return errorResult(usage.message);
      }
    }
    return handler(args);
  };
}

// ─── Build MCP server with tools ──────────────────────────
function createMcpServer(user) {
  // Project, task and doc tools act only inside projects the user is a member
  // of; to anyone else those ids look like they do not exist.
  const uid = String(user._id);
  const denyUnlessMember = async (projectId) =>
    (await isProjectMember(String(projectId), uid)) ? null : errorResult('Error: Project not found.');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const server = new McpServer({
    name: 'Waklum',
    version: '1.0.0',
    description: 'AI-powered project management — create workspaces, projects, tasks, and docs directly from Claude.',
    icons: [
      {
        src: `${baseUrl}/icon.png`,
        mimeType: 'image/png',
      }
    ],
  });

  // ──── Organization Tools ────
  // list_organizations — free lookup, no usage counted
// ─── Result bounding ──────────────────────────────────────────────────────────
// Unbounded list results burn the model's context and can blow the response
// size on large projects. Every list tool fetches one extra row so it can tell
// the model that more exist rather than silently truncating.
const DEFAULT_ROWS = 50;

function boundedResult(rows, cap, hint) {
  const truncated = rows.length > cap;
  const page = truncated ? rows.slice(0, cap) : rows;
  const payload = JSON.stringify(page, null, 2);
  const note = truncated
    ? `\n\nShowing the first ${cap} of more than ${cap} results. ${hint}`
    : '';
  return { content: [{ type: 'text', text: payload + note }] };
}

  server.tool(
    'list_organizations',
    'List all organizations the user belongs to',
    {},
    { readOnlyHint: true },
    async () => {
      await dbConnect();
      const orgs = await Organization.find({
        $or: [
          { owner: user._id },
          { 'members.user': user._id }
        ]
      }).select('name slug owner members createdAt').lean();

      const result = await Promise.all(orgs.map(async (org) => {
        const currentUsage = await McpUsage.getCurrentUsage(org._id);
        const plan = await resolveOrgPlan(org.owner);
        const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

        return {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          plan,
          memberCount: org.members?.length || 0,
          mcpUsage: {
            used: currentUsage,
            limit: limit.mcpCalls === Infinity ? 'unlimited' : limit.mcpCalls,
            remaining: limit.mcpCalls === Infinity ? 'unlimited' : Math.max(0, limit.mcpCalls - currentUsage),
          },
        };
      }));

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'create_organization',
    'Create a new organization (workspace)',
    {
      name: z.string().describe('Organization name'),
      slug: z.string().optional().describe('URL-friendly slug (auto-generated if omitted)'),
    },
    { readOnlyHint: false },
    async ({ name, slug }) => {
      await dbConnect();

      // Check workspace limits based on user's existing orgs
      const existingOrgs = await Organization.find({
        $or: [{ owner: user._id }, { 'members.user': user._id }]
      }).lean();

      // Workspace limit is based on the caller's own subscription plan
      // (they will own any workspace they create).
      const highestPlan = user.subscription?.plan || 'free';

      const workspaceLimits = { free: 1, pro: 3, team: Infinity, enterprise: Infinity };
      const maxWorkspaces = workspaceLimits[highestPlan] ?? Infinity;

      if (existingOrgs.length >= maxWorkspaces) {
        const upgradeUrl = BILLING_URL;
        const nextPlan = highestPlan === 'free' ? 'Pro (up to 3 workspaces)' : 'Team (unlimited workspaces)';
        return errorResult(
          `⚠️ You've reached your ${highestPlan.charAt(0).toUpperCase() + highestPlan.slice(1)} plan limit of ${maxWorkspaces} workspace(s).\n\n` +
          `🚀 Upgrade to ${nextPlan} → ${upgradeUrl}`
        );
      }

      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const existing = await Organization.findOne({ slug: finalSlug });
      if (existing) {
        return errorResult(`Error: Organization with slug "${finalSlug}" already exists.`);
      }

      const org = await Organization.create({
        name,
        slug: finalSlug,
        owner: user._id,
        members: [{ user: user._id, role: 'owner', status: 'active' }],
      });

      await User.findByIdAndUpdate(user._id, { $addToSet: { organizations: org._id } });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: org._id.toString(),
            name: org.name,
            slug: org.slug,
            message: `Organization "${name}" created successfully.`
          }, null, 2)
        }]
      };
    }
  );

  // ──── Project Tools ────
  server.tool(
    'list_projects',
    'List all projects in an organization',
    {
      organizationId: z.string().describe('Organization ID'),
      limit: z.number().int().min(1).max(200).optional().describe('Max rows to return (default 50, max 200)'),
    },
    { readOnlyHint: true },
    withUsageLimit(
      user,
      (args) => args.organizationId,
      async ({ organizationId, limit }) => {
        await dbConnect();
        const cap = limit ?? DEFAULT_ROWS;
        const projects = await Project.find({
          organization: organizationId,
          $or: [{ createdBy: user._id }, { 'members.user': user._id }],
        })
          .select('name slug status tags columns createdAt')
          .sort({ createdAt: -1 })
          .limit(cap + 1)
          .lean();

        const result = projects.map(p => ({
          id: p._id.toString(),
          name: p.name,
          slug: p.slug,
          status: p.status,
          tags: p.tags || [],
          columnCount: p.columns?.length || 0,
        }));

        return boundedResult(result, cap, 'Raise limit to see more.');
      }
    )
  );

  server.tool(
    'create_project',
    'Create a new project in an organization with default Kanban columns',
    {
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      organizationId: z.string().describe('Organization ID'),
      tags: z.array(z.string()).optional().describe('Project tags'),
    },
    { readOnlyHint: false },
    withUsageLimit(
      user,
      (args) => args.organizationId,
      async ({ name, description, organizationId, tags }) => {
        await dbConnect();

        // Check project limits for free plan
        const org = await Organization.findById(organizationId).select('owner').lean();
        const plan = await resolveOrgPlan(org?.owner);
        if (plan === 'free') {
          const projectCount = await Project.countDocuments({ organization: organizationId });
          if (projectCount >= 2) {
            return errorResult(`⚠️ Free plan is limited to 2 projects. You've reached the limit.\n\n🚀 Upgrade to Pro for unlimited projects → ${BILLING_URL}`);
          }
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

        const project = await Project.create({
          name,
          description: description || '',
          slug,
          organization: organizationId,
          status: 'active',
          tags: tags || [],
          columns: [
            { id: 'backlog', name: 'Backlog', color: '#6b7280', order: 0 },
            { id: 'todo', name: 'To Do', color: '#3b82f6', order: 1 },
            { id: 'in-progress', name: 'In Progress', color: '#f59e0b', order: 2 },
            { id: 'review', name: 'Review', color: '#8b5cf6', order: 3 },
            { id: 'done', name: 'Done', color: '#10b981', order: 4 },
          ],
          members: [{ user: user._id, role: 'owner' }],
          createdBy: user._id,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: project._id.toString(),
              name: project.name,
              slug: project.slug,
              columns: project.columns.map(c => c.name),
              message: `Project "${name}" created with ${project.columns.length} Kanban columns.`
            }, null, 2)
          }]
        };
      }
    )
  );

  server.tool(
    'get_project',
    'Get detailed project info including columns and members',
    {
      projectId: z.string().describe('Project ID'),
    },
    { readOnlyHint: true },
    async ({ projectId }) => {
      const denied = await denyUnlessMember(projectId);
      if (denied) return denied;
      await dbConnect();
      const project = await Project.findById(projectId)
        .populate('members.user', 'name email')
        .lean();

      if (!project) {
        return errorResult('Error: Project not found.');
      }

      // Count usage for the project's org
      if (project.organization) {
        const usage = await checkAndIncrementUsage(user, project.organization);
        if (!usage.allowed) {
          return errorResult(usage.message);
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            status: project.status,
            columns: project.columns?.map(c => ({ id: c.id, name: c.name })) || [],
            members: project.members?.map(m => ({
              name: m.user?.name,
              email: m.user?.email,
              role: m.role,
            })) || [],
            tags: project.tags || [],
          }, null, 2)
        }]
      };
    }
  );

  // ──── Task Tools ────
  server.tool(
    'list_tasks',
    'List all tasks in a project, optionally filtered by column or status',
    {
      projectId: z.string().describe('Project ID'),
      columnId: z.string().optional().describe('Filter by column ID (e.g. "todo", "in-progress")'),
      status: z.string().optional().describe('Filter by status'),
      limit: z.number().int().min(1).max(200).optional().describe('Max rows to return (default 50, max 200)'),
    },
    { readOnlyHint: true },
    async ({ projectId, columnId, status, limit }) => {
      const denied = await denyUnlessMember(projectId);
      if (denied) return denied;
      await dbConnect();

      // Get org from project for usage tracking
      const proj = await Project.findById(projectId).select('organization').lean();
      if (proj?.organization) {
        const usage = await checkAndIncrementUsage(user, proj.organization);
        if (!usage.allowed) {
          return errorResult(usage.message);
        }
      }

      const query = { project: projectId };
      if (columnId) query.columnId = columnId;
      if (status) query.status = status;

      const cap = limit ?? DEFAULT_ROWS;
      const tasks = await Task.find(query)
        .populate('assignee', 'name email')
        .select('title description status priority columnId dueDate assignee labels createdAt')
        .sort({ order: 1 })
        .limit(cap + 1)
        .lean();

      const result = tasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        columnId: t.columnId,
        dueDate: t.dueDate,
        assignee: t.assignee ? { name: t.assignee.name, email: t.assignee.email } : null,
        labels: t.labels || [],
      }));

      return boundedResult(result, cap, 'Narrow with columnId or status, or raise limit.');
    }
  );

  server.tool(
    'create_task',
    'Create a new task in a project. If no columnId is provided, defaults to "todo".',
    {
      projectId: z.string().describe('Project ID'),
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description (supports markdown)'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Task priority'),
      columnId: z.string().optional().describe('Column ID to place task in (default: "todo")'),
      dueDate: z.string().optional().describe('Due date (ISO 8601 format, e.g. "2025-06-01")'),
      labels: z.array(z.string()).optional().describe('Task labels/tags'),
    },
    { readOnlyHint: false },
    async ({ projectId, title, description, priority, columnId, dueDate, labels }) => {
      const denied = await denyUnlessMember(projectId);
      if (denied) return denied;
      await dbConnect();

      // Get org from project for usage tracking
      const proj = await Project.findById(projectId).select('organization').lean();
      if (proj?.organization) {
        const usage = await checkAndIncrementUsage(user, proj.organization);
        if (!usage.allowed) {
          return errorResult(usage.message);
        }
      }

      const task = await Task.create({
        title,
        description: description || '',
        project: projectId,
        status: columnId || 'todo',
        priority: priority || 'medium',
        columnId: columnId || 'todo',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        labels: labels || [],
        reporter: user._id,
        createdBy: user._id,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: task._id.toString(),
            title: task.title,
            priority: task.priority,
            columnId: task.columnId,
            message: `Task "${title}" created in column "${task.columnId}".`
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'update_task',
    'Update an existing task — change title, description, priority, status, assignee, etc.',
    {
      taskId: z.string().describe('Task ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('New priority'),
      status: z.string().optional().describe('New status'),
      columnId: z.string().optional().describe('Move to column'),
      dueDate: z.string().optional().describe('New due date (ISO 8601)'),
      labels: z.array(z.string()).optional().describe('Updated labels'),
    },
    { readOnlyHint: false },
    async ({ taskId, ...updates }) => {
      if (!(await isTaskProjectMember(String(taskId), uid))) return errorResult('Error: Task not found.');
      await dbConnect();

      // Get org from task's project for usage tracking
      const existingTask = await Task.findById(taskId).select('project').lean();
      if (existingTask?.project) {
        const proj = await Project.findById(existingTask.project).select('organization').lean();
        if (proj?.organization) {
          const usage = await checkAndIncrementUsage(user, proj.organization);
          if (!usage.allowed) {
            return errorResult(usage.message);
          }
        }
      }

      const updateData = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.status) updateData.status = updates.status;
      if (updates.columnId) updateData.columnId = updates.columnId;
      if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);
      if (updates.labels) updateData.labels = updates.labels;

      const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true });
      if (!task) {
        return errorResult('Error: Task not found.');
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: task._id.toString(),
            title: task.title,
            priority: task.priority,
            columnId: task.columnId,
            message: `Task "${task.title}" updated.`
          }, null, 2)
        }]
      };
    }
  );

  // ──── Doc Tools ────
  server.tool(
    'list_docs',
    'List all documents in a project',
    {
      projectId: z.string().describe('Project ID'),
      limit: z.number().int().min(1).max(200).optional().describe('Max rows to return (default 50, max 200)'),
    },
    { readOnlyHint: true },
    async ({ projectId, limit }) => {
      const denied = await denyUnlessMember(projectId);
      if (denied) return denied;
      await dbConnect();

      // Usage tracking
      const proj = await Project.findById(projectId).select('organization').lean();
      if (proj?.organization) {
        const usage = await checkAndIncrementUsage(user, proj.organization);
        if (!usage.allowed) {
          return errorResult(usage.message);
        }
      }

      const cap = limit ?? DEFAULT_ROWS;
      const docs = await Doc.find({ project: projectId })
        .select('title createdAt updatedAt')
        .sort({ order: 1 })
        .limit(cap + 1)
        .lean();

      const result = docs.map(d => ({
        id: d._id.toString(),
        title: d.title,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));

      return boundedResult(result, cap, 'Raise limit to see more.');
    }
  );

  server.tool(
    'create_doc',
    'Create a new document in a project. Content supports markdown formatting. Optionally include AI-generated visuals (diagrams, flowcharts, architecture diagrams) by providing visual descriptions.',
    {
      projectId: z.string().describe('Project ID'),
      title: z.string().describe('Document title'),
      content: z.string().optional().describe('Document content (markdown)'),
      visuals: z.array(z.object({
        description: z.string().describe('Description of the diagram to generate (e.g. "3-tier architecture with React frontend, Node API, and MongoDB")'),
        placement: z.enum(['top', 'bottom', 'inline']).optional().describe('Where to place the visual in the document (default: bottom)'),
      })).max(4).optional().describe('Optional AI-generated SVG diagrams to embed in the document'),
    },
    { readOnlyHint: false },
    async ({ projectId, title, content, visuals }) => {
      const denied = await denyUnlessMember(projectId);
      if (denied) return denied;
      await dbConnect();

      const proj = await Project.findById(projectId).select('organization').lean();
      if (proj?.organization) {
        const usage = await checkAndIncrementUsage(user, proj.organization);
        if (!usage.allowed) {
          return errorResult(usage.message);
        }
      }

      let finalContent = content || '';

      // Generate visuals concurrently (capped at 4), then assemble in requested order.
      if (visuals && visuals.length > 0) {
        const blocks = await Promise.all(visuals.map(async (visual) => {
          try {
            const svg = await generateSvgDiagram(visual.description, `Document: ${title}`);
            return { placement: visual.placement || 'bottom', block: `\n\n<!-- SVG_VISUAL -->\n${svg}\n<!-- /SVG_VISUAL -->\n` };
          } catch (e) {
            console.error('Visual generation failed for MCP doc:', e);
            return null;
          }
        }));
        for (const b of blocks) {
          if (!b) continue;
          finalContent = b.placement === 'top' ? b.block + '\n' + finalContent : finalContent + b.block;
        }
      }

      const doc = await Doc.create({
        title,
        content: finalContent,
        project: projectId,
        createdBy: user._id,
        lastEditedBy: user._id,
      });

      const visualCount = visuals?.length || 0;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: doc._id.toString(),
            title: doc.title,
            message: `Document "${title}" created.${visualCount > 0 ? ` ${visualCount} visual(s) generated and embedded.` : ''}`
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'update_doc',
    'Update an existing document title or content. Optionally append AI-generated visuals.',
    {
      docId: z.string().describe('Document ID'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content (markdown)'),
      addVisuals: z.array(z.object({
        description: z.string().describe('Description of the diagram to generate'),
        placement: z.enum(['top', 'bottom']).optional().describe('Where to place the visual (default: bottom)'),
      })).max(4).optional().describe('Optional AI-generated SVG diagrams to append'),
    },
    { readOnlyHint: false },
    async ({ docId, title, content, addVisuals }) => {
      await dbConnect();
      const docProject = /^[0-9a-fA-F]{24}$/.test(String(docId)) ? await Doc.findById(docId).select('project').lean() : null;
      if (!docProject || !(await isProjectMember(String(docProject.project), uid))) return errorResult('Error: Doc not found.');
      await dbConnect();

      const existingDoc = await Doc.findById(docId).select('project content').lean();
      if (existingDoc?.project) {
        const proj = await Project.findById(existingDoc.project).select('organization').lean();
        if (proj?.organization) {
          const usage = await checkAndIncrementUsage(user, proj.organization);
          if (!usage.allowed) {
            return errorResult(usage.message);
          }
        }
      }

      const updateData = { lastEditedBy: user._id };
      if (title) updateData.title = title;
      
      let finalContent = content !== undefined ? content : (existingDoc?.content || '');

      if (addVisuals && addVisuals.length > 0) {
        const blocks = await Promise.all(addVisuals.map(async (visual) => {
          try {
            const svg = await generateSvgDiagram(visual.description, `Document: ${title || 'update'}`);
            return { placement: visual.placement || 'bottom', block: `\n\n<!-- SVG_VISUAL -->\n${svg}\n<!-- /SVG_VISUAL -->\n` };
          } catch (e) {
            console.error('Visual generation failed for MCP update:', e);
            return null;
          }
        }));
        for (const b of blocks) {
          if (!b) continue;
          finalContent = b.placement === 'top' ? b.block + '\n' + finalContent : finalContent + b.block;
        }
        updateData.content = finalContent;
      } else if (content !== undefined) {
        updateData.content = content;
      }

      const doc = await Doc.findByIdAndUpdate(docId, updateData, { new: true });
      if (!doc) {
        return errorResult('Error: Document not found.');
      }

      const visualCount = addVisuals?.length || 0;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: doc._id.toString(),
            title: doc.title,
            message: `Document "${doc.title}" updated.${visualCount > 0 ? ` ${visualCount} visual(s) generated and embedded.` : ''}`
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

// ─── Route handlers ───────────────────────────────────────
// Stateless Streamable HTTP: every POST carries its own transport and re-initializes,
// so there is NO shared in-memory session state to lose when consecutive requests
// land on different server instances. (The old in-memory `transports` map and
// legacy SSE transport broke intermittently in production and leaked the API key into
// the SSE endpoint URL — both removed here.)
async function handleMcpRequest(request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Provide a valid API key as a Bearer token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'POST') {
    const server = createMcpServer(user);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — no cross-request session store
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  }

  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      name: 'Waklum MCP Server',
      version: '1.0.0',
      instructions: 'Connect with a Streamable HTTP MCP client (Claude.ai Connectors / ChatGPT) using your API key as a Bearer token.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}

// Wrap response with CORS headers
function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request) {
  const res = await handleMcpRequest(request);
  return withCors(res);
}

export async function POST(request) {
  const res = await handleMcpRequest(request);
  return withCors(res);
}

export async function DELETE(request) {
  const res = await handleMcpRequest(request);
  return withCors(res);
}
