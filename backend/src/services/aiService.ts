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

  private hasApiKey(provider: AIProvider): boolean {
    switch (provider) {
      case 'gemini': return !!process.env.GEMINI_API_KEY;
      case 'openai': return !!process.env.OPENAI_API_KEY;
      case 'claude': return !!process.env.CLAUDE_API_KEY;
    }
  }

  private async generate(provider: AIProvider, prompt: string): Promise<string> {
    // Try requested provider, fallback to any available, then use mock
    const providers: AIProvider[] = [provider, 'gemini', 'openai', 'claude'];
    for (const p of providers) {
      if (this.hasApiKey(p)) {
        return this.callWithRetry(async () => {
          if (p === 'gemini') return this.generateWithGemini(prompt);
          if (p === 'claude') return this.generateWithClaude(prompt);
          return this.generateWithOpenAI(prompt);
        });
      }
    }
    // No API key available — return demo content
    console.log('No AI API key configured — using demo generation');
    return this.generateDemoContent(prompt);
  }

  private generateDemoContent(prompt: string): string {
    // Check what kind of content is requested based on prompt keywords
    if (prompt.includes('flashcards') || prompt.includes('Flashcard')) {
      return JSON.stringify([
        { front: 'What is the main concept?', back: 'The fundamental principle that underlies the entire topic.' },
        { front: 'Name three key benefits', back: '1. Improved efficiency 2. Better understanding 3. Practical application' },
        { front: 'What is the difference between theory and practice?', back: 'Theory provides the conceptual framework, while practice involves applying those concepts in real scenarios.' },
        { front: 'Define the core terminology', back: 'The essential vocabulary and definitions used throughout this subject area.' },
        { front: 'What are the common challenges?', back: 'Understanding complexity, maintaining consistency, and applying knowledge in new contexts.' },
      ]);
    }
    if (prompt.includes('quiz') || prompt.includes('multiple-choice')) {
      return JSON.stringify([
        { question: 'What is the primary purpose of this topic?', options: ['Entertainment', 'Education and skill development', 'Data storage', 'Network management'], correctAnswer: 1, explanation: 'This topic focuses on education and building practical skills.' },
        { question: 'Which approach is most effective for learning?', options: ['Passive reading', 'Active practice and application', 'Memorization only', 'Watching videos only'], correctAnswer: 1, explanation: 'Active practice leads to better retention and understanding.' },
        { question: 'What should you do after completing a lesson?', options: ['Move on immediately', 'Review and practice the concepts', 'Skip the exercises', 'Start a different topic'], correctAnswer: 1, explanation: 'Reviewing reinforces learning and helps identify gaps.' },
        { question: 'How can you measure your progress?', options: ['By time spent', 'By quizzes and practical tests', 'By pages read', 'By bookmarks saved'], correctAnswer: 1, explanation: 'Quizzes and practical tests provide objective measurement of understanding.' },
        { question: 'What is the best study strategy?', options: ['Cramming before exams', 'Spaced repetition over time', 'Reading once thoroughly', 'Highlighting everything'], correctAnswer: 1, explanation: 'Spaced repetition has been proven most effective for long-term retention.' },
      ]);
    }
    if (prompt.includes('summary') || prompt.includes('executive summary')) {
      return 'This course provides a comprehensive overview of the subject, covering fundamental concepts, practical applications, and advanced techniques. Key takeaways include understanding core principles, applying knowledge through hands-on exercises, and building a strong foundation for further learning. The course is structured progressively, starting with basics and advancing to complex topics, ensuring learners can follow along regardless of their starting level.';
    }
    if (prompt.includes('course outline') || prompt.includes('main topics') || prompt.includes('structured course') || prompt.includes('Topic Title')) {
      return JSON.stringify([
        { title: 'Introduction & Fundamentals', subtopics: ['Overview and Objectives', 'Core Concepts', 'Historical Context'] },
        { title: 'Key Principles & Theory', subtopics: ['Fundamental Principles', 'Theoretical Framework', 'Case Studies'] },
        { title: 'Practical Application', subtopics: ['Hands-on Exercises', 'Real-world Examples', 'Best Practices'] },
        { title: 'Advanced Concepts', subtopics: ['Complex Scenarios', 'Optimization Techniques', 'Future Trends'] },
        { title: 'Review & Assessment', subtopics: ['Knowledge Check', 'Practical Test', 'Next Steps'] },
      ]);
    }
    // Default: generate subtopic content for a topic
    // Extract subtopic names from prompt if possible
    const subtopicMatches = prompt.match(/\d+\.\s+(.+)/g);
    const subtopicNames = subtopicMatches
      ? subtopicMatches.map(m => m.replace(/^\d+\.\s+/, ''))
      : ['Introduction', 'Key Concepts', 'Practical Applications'];

    return JSON.stringify(subtopicNames.map((name, i) => ({
      title: name,
      content: `## ${name}\n\nThis section covers the essential aspects of ${name.toLowerCase()}. Understanding this topic is crucial for building a solid foundation.\n\n### Key Points\n\n1. **Core Understanding** — ${name} forms an important part of this subject area. By studying it carefully, you'll gain insights that apply across many contexts.\n\n2. **Practical Application** — The concepts here aren't just theoretical. They have direct real-world applications that you can start using immediately.\n\n3. **Building Blocks** — Each concept builds on the previous one, creating a comprehensive understanding of the topic.\n\n### Examples\n\nConsider how ${name.toLowerCase()} applies in everyday scenarios. For instance, professionals in this field regularly use these principles to solve complex problems and create innovative solutions.\n\n### Summary\n\nMastering ${name.toLowerCase()} will give you a significant advantage in understanding the broader subject. Take time to review the key points and practice applying them.`,
      imageSearchTerm: `${name.toLowerCase()} education concept`,
    })));
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
