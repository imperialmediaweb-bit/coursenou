class ImageService {
  private accessKey: string;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  async searchImage(query: string): Promise<string | null> {
    if (!this.accessKey) {
      // Use picsum.photos with deterministic seed from query
      const seed = query.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toLowerCase() || 'default';
      return `https://picsum.photos/seed/${seed}/800/450`;
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
