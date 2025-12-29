import { query } from '../db/index.js';
import { ConversationSession,  WorkflowDefinition } from '../types/index.js';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    workflowPreview?: Partial<WorkflowDefinition>;
    suggestedActions?: string[];
  };
}

export async function createSession(userId: string): Promise<ConversationSession> {
  const result = await query<ConversationSession>(
    `INSERT INTO conversation_sessions (user_id, messages, context, status)
     VALUES ($1, '[]'::jsonb, '{}'::jsonb, 'active')
     RETURNING *`,
    [userId]
  );
  
  return result.rows[0];
}

export async function getSessionById(id: string): Promise<ConversationSession | null> {
  const result = await query<ConversationSession>(
    'SELECT * FROM conversation_sessions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getSessionsByUserId(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ sessions: ConversationSession[]; total: number }> {
  const offset = (page - 1) * limit;
  
  const [sessionsResult, countResult] = await Promise.all([
    query<ConversationSession>(
      `SELECT * FROM conversation_sessions WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM conversation_sessions WHERE user_id = $1',
      [userId]
    ),
  ]);
  
  return {
    sessions: sessionsResult.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

export async function addMessageToSession(
  sessionId: string,
  message: ConversationMessage
): Promise<ConversationSession | null> {
  const result = await query<ConversationSession>(
    `UPDATE conversation_sessions 
     SET messages = messages || $1::jsonb, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify([message]), sessionId]
  );
  
  return result.rows[0] || null;
}

export async function updateSessionContext(
  sessionId: string,
  context: ConversationSession['context']
): Promise<ConversationSession | null> {
  const result = await query<ConversationSession>(
    `UPDATE conversation_sessions 
     SET context = context || $1::jsonb, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(context), sessionId]
  );
  
  return result.rows[0] || null;
}

export async function linkWorkflowToSession(
  sessionId: string,
  workflowId: string
): Promise<ConversationSession | null> {
  const result = await query<ConversationSession>(
    `UPDATE conversation_sessions 
     SET workflow_id = $1, status = 'completed', updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [workflowId, sessionId]
  );
  
  return result.rows[0] || null;
}

export async function completeSession(sessionId: string): Promise<ConversationSession | null> {
  const result = await query<ConversationSession>(
    `UPDATE conversation_sessions 
     SET status = 'completed', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );
  
  return result.rows[0] || null;
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await query('DELETE FROM conversation_sessions WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
