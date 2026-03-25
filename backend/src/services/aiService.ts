import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type AIProvider = 'gemini' | 'openai' | 'claude';

interface TopicResult {
  title: string;
  subtopics: string[];
}

interface SubtopicContent {
  title: string;
  content: string;
  imageSearchTerm: string;
}

interface TopicContent {
  title: string;
  subtopics: SubtopicContent[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

class AIService {
  private getGemini() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return this.callWithRetry(fn, retries - 1);
      }
      throw new Error(`AI generation failed: ${error.message || 'Unknown error'}`);
    }
  }

  private async generateWithGemini(prompt: string): Promise<string> {
    const model = this.getGemini();
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  private async generateWithOpenAI(prompt: string): Promise<string> {
    const openai = this.getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || '';
  }

  private getClaude() {
    return new Anthropic({ apiKey: process.env.CLAUDE_API_KEY! });
  }

  private async generateWithClaude(prompt: string): Promise<string> {
    const client = this.getClaude();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return block.type === 'text' ? block.text : '';
  }

  private async generate(provider: AIProvider, prompt: string): Promise<string> {
    return this.callWithRetry(async () => {
      if (provider === 'gemini') {
        return this.generateWithGemini(prompt);
      }
      if (provider === 'claude') {
        return this.generateWithClaude(prompt);
      }
      return this.generateWithOpenAI(prompt);
    });
  }

  private parseJSON<T>(text: string): T {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleanText = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(cleanText);
  }

  async generateTopics(
    provider: AIProvider,
    title: string,
    language: string,
    numTopics: number
  ): Promise<TopicResult[]> {
    const prompt = `Generate a structured course outline for the topic: "${title}" in ${language} language.
Create exactly ${numTopics} main topics, each with 3-4 subtopics.

Return ONLY valid JSON in this format:
[
  {
    "title": "Topic Title",
    "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"]
  }
]

Requirements:
- Topics should be logically ordered from beginner to advanced
- Each topic title should be clear and descriptive
- Subtopics should cover specific aspects of the main topic
- All content must be in ${language}`;

    const result = await this.generate(provider, prompt);
    return this.parseJSON<TopicResult[]>(result);
  }

  async generateCourse(
    provider: AIProvider,
    topics: TopicResult[],
    type: 'image' | 'video',
    language: string
  ): Promise<TopicContent[]> {
    const courseContent: TopicContent[] = [];

    for (const topic of topics) {
      const prompt = `Generate detailed educational content for the topic: "${topic.title}" in ${language}.

For each of the following subtopics, provide comprehensive educational content (300-500 words each):
${topic.subtopics.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return ONLY valid JSON in this format:
[
  {
    "title": "Subtopic Title",
    "content": "Detailed educational content with explanations, examples, and key concepts...",
    "imageSearchTerm": "relevant search term for finding an illustrative image"
  }
]

Requirements:
- Content should be educational, well-structured, and engaging
- Include practical examples where applicable
- Use clear explanations suitable for learners
- All content must be in ${language}
- imageSearchTerm should be in English for image search APIs`;

      const result = await this.generate(provider, prompt);
      const subtopics = this.parseJSON<SubtopicContent[]>(result);

      courseContent.push({
        title: topic.title,
        subtopics,
      });
    }

    return courseContent;
  }

  async generateQuiz(
    provider: AIProvider,
    courseContent: string,
    language: string,
    numQuestions: number
  ): Promise<QuizQuestion[]> {
    const prompt = `Based on the following course content, generate ${numQuestions} multiple-choice quiz questions in ${language}.

Course content:
${courseContent.substring(0, 8000)}

Return ONLY valid JSON in this format:
[
  {
    "question": "The question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation of why this is the correct answer"
  }
]

Requirements:
- Questions should test understanding, not just recall
- Each question must have exactly 4 options
- correctAnswer is the zero-based index of the correct option
- Include clear explanations for each answer
- Questions should cover different topics from the course
- All content must be in ${language}`;

    const result = await this.generate(provider, prompt);
    return this.parseJSON<QuizQuestion[]>(result);
  }

  async chatResponse(
    provider: AIProvider,
    message: string,
    courseContext: string
  ): Promise<string> {
    const prompt = `You are an AI tutor helping a student understand course material. Be helpful, concise, and educational.

Course context:
${courseContext.substring(0, 4000)}

Student question: ${message}

Provide a clear, helpful response. If the question is unrelated to the course, politely redirect to course topics.`;

    return this.generate(provider, prompt);
  }
}

export const aiService = new AIService();
