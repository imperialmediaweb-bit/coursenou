class ImageService {
  private accessKey: string;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  async searchImage(query: string): Promise<string | null> {
    if (!this.accessKey) {
      // Generate a themed placeholder image using placehold.co
      // Clean query for display, take first 30 chars
      const label = encodeURIComponent(query.substring(0, 30).trim());
      // Generate consistent color from query
      const colors = ['6C47FF', '4F46E5', '7C3AED', '2563EB', '0891B2', '059669', 'D97706', 'DC2626'];
      const hash = Math.abs(query.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
      const bg = colors[hash % colors.length];
      return `https://placehold.co/800x450/${bg}/FFFFFF/png?text=${label}&font=roboto`;
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
