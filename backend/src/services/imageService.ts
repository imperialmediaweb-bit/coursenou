import OpenAI from 'openai';

class ImageService {
  private unsplashKey: string;

  constructor() {
    this.unsplashKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  async searchImage(query: string): Promise<string | null> {
    // 1. Try DALL-E if OpenAI key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        return await this.generateWithDallE(query);
      } catch (error: any) {
        console.error('DALL-E generation failed:', error.message);
        // Fall through to other methods
      }
    }

    // 2. Try Unsplash API if key is available
    if (this.unsplashKey) {
      try {
        return await this.searchUnsplash(query);
      } catch (error: any) {
        console.error('Unsplash search failed:', error.message);
      }
    }

    // 3. Fallback to picsum.photos placeholder
    const seed = query.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toLowerCase() || 'default';
    return `https://picsum.photos/seed/${seed}/800/450`;
  }

  private async generateWithDallE(query: string): Promise<string> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Educational illustration for a course about: ${query}. Clean, professional, modern style. No text in the image.`,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    });

    const url = response.data?.[0]?.url;
    if (!url) throw new Error('No image URL returned');
    return url;
  }

  private async searchUnsplash(query: string): Promise<string | null> {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${this.unsplashKey}` },
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
    return null;
  }
}

export const imageService = new ImageService();
