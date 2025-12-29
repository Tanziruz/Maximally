import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import {  WorkflowDefinition } from '../types/index.js';
import dotenv from 'dotenv';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    workflowPreview?: Partial<WorkflowDefinition>;
    suggestedActions?: string[];
  };
}

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are an AI assistant that helps users create workflow automations through natural conversation. Your goal is to understand what the user wants to automate and help them build a workflow step by step.

WORKFLOW STRUCTURE:
Workflows consist of:
1. A TRIGGER (what starts the workflow):
   - "schedule": Run on a cron schedule (e.g., "0 9 * * MON" for every Monday at 9am)
   - "webhook": Run when a webhook is received
   - "manual": Run manually by the user

2. STEPS (actions to perform):
   - "http_request": Make an HTTP API call
   - "send_email": Send an email
   - "transform_data": Transform/manipulate data
   - "delay": Wait for a specified time

CONVERSATION GUIDELINES:
1. Ask clarifying questions to understand the user's needs
2. Be friendly and conversational
3. Explain what you're building in simple terms
4. When you have enough information, generate the workflow JSON
5. Always validate that the user is happy with the workflow before finalizing

RESPONSE FORMAT:
When you have enough information to create a workflow, include a JSON block in your response:

\`\`\`workflow
{
  "trigger": { ... },
  "steps": [ ... ]
}
\`\`\`

DATA TEMPLATING:
Steps can reference data from previous steps using template syntax:
- {{trigger.data}} - Data from webhook trigger
- {{step_id.body}} - Response body from HTTP request with id "step_id"
- {{step_id.body.field}} - Access nested fields in JSON responses
- {{step_id.status}} - HTTP status code from request
- {{step_id.headers}} - Response headers

IMPORTANT: HTTP responses are stored as:
{
  "step_id": {
    "status": 200,
    "statusText": "OK", 
    "headers": {...},
    "body": <parsed response>
  }
}

For plain text responses, {{step_id.body}} returns the text directly.
For JSON responses, body is already parsed - use {{step_id.body.fieldName}}.

EXAMPLE WORKFLOW:
For "Send me an email every Monday with weather data":
\`\`\`workflow
{
  "trigger": {
    "type": "schedule",
    "cron": "0 9 * * MON",
    "timezone": "UTC"
  },
  "steps": [
    {
      "id": "get_temperature",
      "name": "Get Temperature",
      "type": "http_request",
      "config": {
        "method": "GET",
        "url": "https://wttr.in/London?format=%t"
      }
    },
    {
      "id": "get_conditions",
      "name": "Get Weather Conditions",
      "type": "http_request",
      "config": {
        "method": "GET",
        "url": "https://wttr.in/London?format=%C"
      }
    },
    {
      "id": "send_weather_email",
      "name": "Send Weather Email",
      "type": "send_email",
      "config": {
        "to": "user@example.com",
        "subject": "Weekly Weather Update",
        "body": "Temperature: {{get_temperature.body}}, Conditions: {{get_conditions.body}}",
        "isHtml": false
      }
    }
  ]
}
\`\`\`

IMPORTANT RULES:
1. Always use valid cron expressions for schedules
2. HTTP URLs must be complete and valid
3. Each step must have a unique id
4. Reference previous step data correctly using template syntax
5. FOR WEATHER: Always use wttr.in with simple format codes (NO JSON):
   - Temperature: https://wttr.in/{city}?format=%t (returns "15°C")
   - Conditions: https://wttr.in/{city}?format=%C (returns "Clear")
   - Wind: https://wttr.in/{city}?format=%w (returns "10 km/h")
   Then use {{step_id.body}} directly in email (already formatted)
6. For other APIs, if JSON structure is unknown, prefer simple text endpoints
7. Be helpful and guide the user through the process
8. If the user's request is unclear, ask specific questions
9. Suggest improvements or best practices when appropriate`;

export async function generateWorkflowResponse(
  messages: ConversationMessage[],
  userMessage: string
): Promise<{
  response: string;
  workflowPreview?: Partial<WorkflowDefinition>;
  isComplete: boolean;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Convert messages to Gemini format
  const history: Content[] = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const result = await chat.sendMessage(userMessage);
  const responseText = result.response.text();

  // Extract workflow JSON if present
  const workflowMatch = responseText.match(/```workflow\n([\s\S]*?)\n```/);
  let workflowPreview: Partial<WorkflowDefinition> | undefined;
  let isComplete = false;

  if (workflowMatch) {
    try {
      workflowPreview = JSON.parse(workflowMatch[1]);
      isComplete = true;
    } catch (e) {
      console.error('Failed to parse workflow JSON:', e);
    }
  }

  // Clean response text (remove workflow JSON for cleaner display)
  const cleanResponse = responseText
    .replace(/```workflow\n[\s\S]*?\n```/g, '')
    .trim();

  return {
    response: cleanResponse,
    workflowPreview,
    isComplete,
  };
}

export async function improveWorkflow(
  currentWorkflow: WorkflowDefinition,
  userFeedback: string
): Promise<{
  response: string;
  updatedWorkflow: WorkflowDefinition;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Current workflow:
\`\`\`json
${JSON.stringify(currentWorkflow, null, 2)}
\`\`\`

User feedback: ${userFeedback}

Please update the workflow based on the user's feedback and return the updated workflow in a \`\`\`workflow code block. Also explain what changes you made.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: SYSTEM_PROMPT,
  });

  const responseText = result.response.text();
  const workflowMatch = responseText.match(/```workflow\n([\s\S]*?)\n```/);

  let updatedWorkflow = currentWorkflow;
  if (workflowMatch) {
    try {
      updatedWorkflow = JSON.parse(workflowMatch[1]);
    } catch (e) {
      console.error('Failed to parse updated workflow:', e);
    }
  }

  const cleanResponse = responseText
    .replace(/```workflow\n[\s\S]*?\n```/g, '')
    .trim();

  return {
    response: cleanResponse,
    updatedWorkflow,
  };
}

export async function generateWorkflowFromDescription(
  description: string
): Promise<WorkflowDefinition | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Generate a complete workflow based on this description: "${description}"

Return ONLY a valid JSON workflow in a \`\`\`workflow code block. Include all necessary details and make reasonable assumptions for any missing information.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: SYSTEM_PROMPT,
  });

  const responseText = result.response.text();
  const workflowMatch = responseText.match(/```workflow\n([\s\S]*?)\n```/);

  if (workflowMatch) {
    try {
      return JSON.parse(workflowMatch[1]) as WorkflowDefinition;
    } catch (e) {
      console.error('Failed to parse workflow:', e);
    }
  }

  return null;
}
