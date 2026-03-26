class ImageService {
  private accessKey: string;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  async searchImage(query: string): Promise<string | null> {
    if (!this.accessKey) {
      // No Unsplash key — return placeholder image based on query hash
      const hash = Math.abs(query.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
      return `https://picsum.photos/seed/${hash}/800/450`;
    }

    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].urls.regular;
      }
      return null;
    } catch (error: any) {
      console.error('Image search failed:', error.message);
      return null;
    }
  }
}

export const imageService = new ImageService();
