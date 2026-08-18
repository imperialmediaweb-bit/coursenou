import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { recordUsage } from './usageService';

type AIProvider = 'gemini' | 'openai' | 'claude';

// Named here so the calls and the price table in usageService cannot drift.
const OPENAI_MODEL = 'gpt-4o';
const GEMINI_MODEL = 'gemini-1.5-flash';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/** What a provider produced, and what it consumed producing it. */
interface GenerationResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Who and what a call was for, so its cost can be attributed. */
export interface UsageContext {
  userId?: string | null;
  courseId?: string | null;
  operation: string;
}

/** Which shape of demo content to emit when no provider is reachable. */
type DemoKind = 'lesson';

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
    return genAI.getGenerativeModel({ model: GEMINI_MODEL });
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

  private async generateWithGemini(prompt: string): Promise<GenerationResult> {
    const model = this.getGemini();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const usage = (response as any).usageMetadata || {};
    return {
      text: response.text(),
      provider: 'gemini',
      model: GEMINI_MODEL,
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
    };
  }

  private async generateWithOpenAI(prompt: string): Promise<GenerationResult> {
    const openai = this.getOpenAI();
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      // Lessons are long-form now; the default cap truncated them mid-sentence.
      max_tokens: 4000,
    });
    return {
      text: response.choices[0]?.message?.content || '',
      provider: 'openai',
      model: OPENAI_MODEL,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    };
  }

  private getClaude() {
    return new Anthropic({ apiKey: process.env.CLAUDE_API_KEY! });
  }

  private async generateWithClaude(prompt: string): Promise<GenerationResult> {
    const client = this.getClaude();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return {
      text: block.type === 'text' ? block.text : '',
      provider: 'claude',
      model: CLAUDE_MODEL,
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    };
  }

  private hasApiKey(provider: AIProvider): boolean {
    switch (provider) {
      case 'gemini': return !!process.env.GEMINI_API_KEY;
      case 'openai': return !!process.env.OPENAI_API_KEY;
      case 'claude': return !!process.env.CLAUDE_API_KEY;
    }
  }

  private async generate(
    provider: AIProvider,
    prompt: string,
    demoKind?: DemoKind,
    usageContext?: UsageContext
  ): Promise<string> {
    // Try requested provider, fallback to any available, then use mock
    const providers: AIProvider[] = [provider, 'openai', 'gemini', 'claude'];
    const tried: string[] = [];

    for (const p of providers) {
      if (this.hasApiKey(p) && !tried.includes(p)) {
        tried.push(p);
        try {
          const result =
            p === 'gemini'
              ? await this.generateWithGemini(prompt)
              : p === 'claude'
              ? await this.generateWithClaude(prompt)
              : await this.generateWithOpenAI(prompt);

          // Recorded rather than awaited: the cost of a course must never be
          // the reason a course fails to arrive.
          if (usageContext) {
            recordUsage({
              userId: usageContext.userId,
              courseId: usageContext.courseId,
              operation: usageContext.operation,
              provider: result.provider,
              model: result.model,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
            }).catch(() => {});
          }

          return result.text;
        } catch (error: any) {
          console.error(`AI provider ${p} failed:`, error.message || error);
          // Continue to next provider
        }
      }
    }

    // All providers failed or none configured — use demo content.
    //
    // Recorded, because otherwise this is the quietest failure in the product:
    // a wrong key or an exhausted quota serves every customer placeholder text
    // that reads like a real course, the platform looks perfectly healthy, and
    // nobody finds out until somebody complains about the writing. Written to
    // the usage log at zero cost so it shows up in the admin panel next to
    // everything else.
    console.error('All AI providers failed or none configured — serving template content');
    if (usageContext) {
      recordUsage({
        userId: usageContext.userId,
        courseId: usageContext.courseId,
        operation: usageContext.operation,
        provider: 'fallback',
        model: 'template',
        inputTokens: 0,
        outputTokens: 0,
      }).catch(() => {});
    }
    return this.generateDemoContent(prompt, demoKind);
  }

  private generateDemoContent(prompt: string, demoKind?: DemoKind): string {
    if (demoKind === 'lesson') return this.demoLesson(prompt);

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
    let cleanText = jsonMatch ? jsonMatch[1].trim() : text.trim();
    // Try to find JSON array or object in text
    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    const objectMatch = cleanText.match(/\{[\s\S]*\}/);
    if (arrayMatch) cleanText = arrayMatch[0];
    else if (objectMatch) cleanText = objectMatch[0];
    return JSON.parse(cleanText);
  }

  async generateTopics(
    provider: AIProvider,
    title: string,
    language: string,
    numTopics: number,
    usage?: UsageContext
  ): Promise<TopicResult[]> {
    const prompt = `Generate a structured course outline for the topic: "${title}" in ${language} language.
Create exactly ${numTopics} main topics, each with exactly 4 subtopics.

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
- Subtopics must be specific, teachable lessons — not vague labels like "Overview" or "Introduction"
- No subtopic may repeat across topics
- All content must be in ${language}`;

    const result = await this.generate(provider, prompt, undefined, usage);
    const topics = this.parseJSON<TopicResult[]>(result);
    return topics.slice(0, numTopics);
  }

  async generateCourse(
    provider: AIProvider,
    topics: TopicResult[],
    type: 'image' | 'video',
    language: string,
    courseTitle = '',
    usage?: UsageContext
  ): Promise<TopicContent[]> {
    // One request per lesson rather than one per topic. Asking a model for
    // three 500-word lessons inside a single JSON array reliably produced
    // truncated or unescaped JSON — the parse failed and the whole topic fell
    // back to filler text ("This is an important concept that builds on
    // fundamental principles..."), which is exactly what learners complained
    // about. A single lesson as plain Markdown has nothing to parse, so it
    // cannot fail that way, and each response has room to be genuinely long.
    const jobs = topics.flatMap((topic, topicIndex) =>
      topic.subtopics.map((subtopic, subtopicIndex) => ({
        topicIndex,
        subtopicIndex,
        topicTitle: topic.title,
        subtopic,
      }))
    );

    const results: TopicContent[] = topics.map((topic) => ({
      title: topic.title,
      subtopics: new Array(topic.subtopics.length),
    }));

    // Scale the pool with the workload so a 20-topic course still finishes
    // inside the request window, without hammering the provider on small ones.
    const concurrency = Math.min(8, Math.max(4, Math.ceil(jobs.length / 8)));
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const index = cursor++;
        if (index >= jobs.length) return;
        const job = jobs[index];
        results[job.topicIndex].subtopics[job.subtopicIndex] = await this.generateLesson(
          provider,
          courseTitle,
          job.topicTitle,
          job.subtopic,
          language,
          usage
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker())
    );

    return results;
  }

  private lessonPrompt(
    courseTitle: string,
    topicTitle: string,
    subtopic: string,
    language: string
  ): string {
    return `You are an expert instructor writing one lesson of the online course "${courseTitle || topicTitle}".

Module: "${topicTitle}"
Lesson: "${subtopic}"
Language: ${language}

Write the complete lesson body in Markdown, 700-900 words, structured exactly like this:

1. An opening paragraph of 2-4 sentences saying what this lesson covers and why it matters.
2. Three or four "## " sections, each with a descriptive heading and one or two substantial paragraphs of specific, concrete explanation.
3. At least one worked example, case study or step-by-step walkthrough. If the subject is technical, include a fenced code block with real, runnable code and explain it underneath.
4. One "> " blockquote holding a single memorable key insight.
5. A "## Key Takeaways" section with 4-5 "- " bullets, each opening with a **bolded phrase** followed by an em dash and a specific point.
6. A "## Common Mistakes" section with 2-3 "- " bullets describing real errors beginners make and how to avoid them.

Rules:
- Teach real substance: actual facts, figures, names, tools, techniques. Never write filler such as "this is an important concept", "builds on fundamental principles" or "has real-world applications across many fields".
- Do not restate the lesson title as a heading; it is already displayed above your text.
- Write everything in ${language}.
- Output Markdown only — no JSON, no preamble, no closing pleasantries.

Finish with one final line, in English, in exactly this form (2-4 words naming a concrete, photographable object or scene that illustrates the lesson):
IMAGE: <search query>`;
  }

  /** Generates a single lesson body, retrying once before falling back. */
  private async generateLesson(
    provider: AIProvider,
    courseTitle: string,
    topicTitle: string,
    subtopic: string,
    language: string,
    usage?: UsageContext
  ): Promise<SubtopicContent> {
    const prompt = this.lessonPrompt(courseTitle, topicTitle, subtopic, language);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this.generate(provider, prompt, 'lesson', usage);
        const lesson = this.parseLesson(raw, courseTitle, topicTitle, subtopic);
        // A stub response is worse than a retry — a real lesson is long.
        if (lesson.content.length >= 400) return lesson;
      } catch (err: any) {
        console.error(`Lesson "${subtopic}" attempt ${attempt + 1} failed:`, err.message || err);
      }
    }

    console.error(`Falling back to template content for lesson "${subtopic}"`);
    return {
      title: subtopic,
      content: this.demoLessonBody(courseTitle || topicTitle, topicTitle, subtopic),
      imageSearchTerm: `${topicTitle} ${subtopic}`,
    };
  }

  /**
   * Splits the trailing `IMAGE:` hint off the lesson body and tidies up the
   * markdown the model tends to wrap around it.
   */
  private parseLesson(
    raw: string,
    courseTitle: string,
    topicTitle: string,
    subtopic: string
  ): SubtopicContent {
    let body = (raw || '').trim();

    // Models occasionally wrap the whole answer in a ```markdown fence.
    const fenced = body.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
    if (fenced) body = fenced[1].trim();

    let imageSearchTerm = '';
    const imageLine = body.match(/^[ \t>*_-]*IMAGE\s*:\s*(.+?)[ \t*_]*$/im);
    if (imageLine) {
      imageSearchTerm = imageLine[1].replace(/[`"'.]/g, '').trim();
      body = body.replace(imageLine[0], '').trim();
    }

    // Drop a repeated lesson title at the very top — the UI already shows it.
    body = body.replace(/^#{1,3}\s*(.+)\n+/, (match, heading: string) =>
      heading.trim().toLowerCase() === subtopic.trim().toLowerCase() ? '' : match
    );

    return {
      title: subtopic,
      content: body,
      imageSearchTerm: imageSearchTerm || `${topicTitle} ${subtopic}`,
    };
  }

  /** Demo-mode lesson: no API key configured, so no provider was reachable. */
  private demoLesson(prompt: string): string {
    const course = prompt.match(/course "([^"]+)"/)?.[1] || 'this course';
    const topicTitle = prompt.match(/Module: "([^"]+)"/)?.[1] || course;
    const subtopic = prompt.match(/Lesson: "([^"]+)"/)?.[1] || 'this lesson';
    return `${this.demoLessonBody(course, topicTitle, subtopic)}\n\nIMAGE: ${subtopic}`;
  }

  private demoLessonBody(course: string, topicTitle: string, subtopic: string): string {
    return `${subtopic} is one of the building blocks of ${topicTitle}. This lesson walks through what it is, how practitioners actually use it, and the judgement calls that separate a working understanding from a superficial one.

## Why it matters

Every discipline has a handful of ideas that everything else hangs from, and within ${topicTitle} this is one of them. Get it right and the later material in ${course} follows naturally; skip it and you end up memorising procedures without knowing when they apply.

## How it works in practice

Start from the simplest case you can construct, verify that you can predict the outcome before you run it, then add one variable at a time. Practitioners rarely reason about the whole system at once — they isolate a piece, confirm their mental model against it, and only then widen the scope.

> Understanding is the ability to predict the result before you see it.

## Working through an example

Take a realistic scenario from your own context and apply the idea end to end. Write down what you expect to happen, carry out the steps, and compare. Where the result differs from your prediction, that gap is precisely the part of the concept you have not internalised yet — and it is the most valuable thing you will study today.

## Key Takeaways

- **Start small** — a minimal example you fully understand beats a complex one you only half follow.
- **Predict first** — commit to an expected outcome before you test, so you learn from the mismatch.
- **Change one thing** — isolating variables is what turns guessing into diagnosis.
- **Practise deliberately** — revisit this lesson after a day and again after a week.

## Common Mistakes

- **Reading without doing** — recognition feels like understanding but does not survive contact with a real problem.
- **Skipping the fundamentals** — later lessons in ${topicTitle} assume this one is solid.`;
  }

  async generateQuiz(
    provider: AIProvider,
    courseContent: string,
    language: string,
    numQuestions: number,
    usage?: UsageContext
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

    const result = await this.generate(provider, prompt, undefined, usage);
    return this.parseJSON<QuizQuestion[]>(result);
  }

  async chatResponse(
    provider: AIProvider,
    message: string,
    courseContext: string,
    usage?: UsageContext
  ): Promise<string> {
    const prompt = `You are an AI tutor helping a student understand course material. Be helpful, concise, and educational.

Course context:
${courseContext.substring(0, 4000)}

Student question: ${message}

Provide a clear, helpful response. If the question is unrelated to the course, politely redirect to course topics.`;

    return this.generate(provider, prompt, undefined, usage);
  }
}

export const aiService = new AIService();
