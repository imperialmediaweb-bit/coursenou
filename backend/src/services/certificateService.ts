class CertificateService {
  async generateCertificatePDF(userName: string, courseName: string, issuedAt: Date): Promise<Buffer> {
    let browser;
    try {
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      const dateStr = issuedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: landscape; margin: 0; }
    body { margin: 0; padding: 0; font-family: 'Georgia', serif; }
    .certificate {
      width: 1056px; height: 816px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .inner {
      width: 956px; height: 716px;
      background: white;
      border-radius: 16px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .border-accent {
      position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px;
      border: 2px solid #e0e7ff; border-radius: 12px;
    }
    .logo { font-size: 18px; color: #6366f1; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
    .title { font-size: 42px; color: #1f2937; margin: 8px 0; font-weight: bold; }
    .subtitle { font-size: 16px; color: #6b7280; margin-bottom: 24px; letter-spacing: 2px; text-transform: uppercase; }
    .name { font-size: 36px; color: #4f46e5; font-style: italic; margin: 16px 0; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px; display: inline-block; }
    .course { font-size: 20px; color: #374151; margin: 12px 0; max-width: 600px; }
    .date { font-size: 14px; color: #9ca3af; margin-top: 24px; }
    .badge { position: absolute; bottom: 40px; right: 60px; width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; }
    .badge span { color: white; font-size: 10px; font-weight: bold; text-transform: uppercase; text-align: center; line-height: 1.2; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="inner">
      <div class="border-accent"></div>
      <div class="logo">CourseBit</div>
      <div class="title">Certificate of Completion</div>
      <div class="subtitle">This certifies that</div>
      <div class="name">${this.escapeHtml(userName)}</div>
      <div class="course">has successfully completed the course<br><strong>"${this.escapeHtml(courseName)}"</strong></div>
      <div class="date">Issued on ${dateStr}</div>
      <div class="badge"><span>Verified<br>Complete</span></div>
    </div>
  </div>
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: 1056, height: 816 });

      const pdfBuffer = await page.pdf({
        width: '1056px',
        height: '816px',
        printBackground: true,
        landscape: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const certificateService = new CertificateService();
