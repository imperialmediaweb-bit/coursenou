import OpenAI from 'openai';

class ImageService {
  async searchImage(query: string): Promise<string | null> {
    // 1. Try Pixabay (free, real photos, relevant)
    if (process.env.PIXABAY_API_KEY) {
      try {
        const result = await this.searchPixabay(query);
        if (result) return result;
      } catch (error: any) {
        console.error('Pixabay search failed:', error.message);
      }
    }

    // 2. Try Unsplash API
    if (process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const result = await this.searchUnsplash(query);
        if (result) return result;
      } catch (error: any) {
        console.error('Unsplash search failed:', error.message);
      }
    }

    // 3. Try DALL-E (costs $0.04/image)
    if (process.env.OPENAI_API_KEY && process.env.USE_DALLE_IMAGES === 'true') {
      try {
        return await this.generateWithDallE(query);
      } catch (error: any) {
        console.error('DALL-E generation failed:', error.message);
      }
    }

    // 4. Fallback to picsum.photos
    const seed = query.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toLowerCase() || 'default';
    return `https://picsum.photos/seed/${seed}/800/450`;
  }

  private async searchPixabay(query: string): Promise<string | null> {
    const cleanQuery = query.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const url = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(cleanQuery)}&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data: any = await response.json();
    if (data.hits && data.hits.length > 0) {
      // Pick a random one from top 3 for variety
      const idx = Math.floor(Math.random() * Math.min(3, data.hits.length));
      return data.hits[idx].webformatURL;
    }
    return null;
  }

  private async searchUnsplash(query: string): Promise<string | null> {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
    return null;
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
}

export const imageService = new ImageService();
