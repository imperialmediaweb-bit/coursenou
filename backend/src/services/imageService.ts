class ImageService {
  private accessKey: string;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  async searchImage(query: string): Promise<string | null> {
    if (!this.accessKey) {
      // Use Unsplash Source (no API key needed) — returns real photos
      const cleanQuery = query.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(' ').slice(0, 3).join(',');
      return `https://source.unsplash.com/800x450/?${encodeURIComponent(cleanQuery)}`;
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
