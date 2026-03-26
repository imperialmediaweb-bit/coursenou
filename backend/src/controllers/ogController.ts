import { Request, Response, NextFunction } from 'express';
import { getDemoCourse } from '../utils/demoStore';
import prisma from '../utils/prisma';

export const generateOGImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courseId = req.params.id;
    let course: any = getDemoCourse(courseId);

    if (!course) {
      try {
        course = await prisma.course.findUnique({ where: { id: courseId } });
      } catch {}
    }

    const title = course?.title || 'AI Generated Course';
    const topicsCount = course?.topics?.length || 0;
    const language = course?.language || 'English';

    // Return an SVG OG image
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0F1117"/>
          <stop offset="100%" style="stop-color:#1a1d2e"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#6C47FF"/>
          <stop offset="100%" style="stop-color:#8B6FFF"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <rect x="0" y="590" width="1200" height="40" fill="url(#accent)"/>
      <rect x="60" y="60" width="8" height="80" rx="4" fill="url(#accent)"/>
      <text x="88" y="110" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#6C47FF">COURSBIT</text>
      <text x="88" y="140" font-family="Arial,sans-serif" font-size="16" fill="#5C6078">AI-Powered Course</text>
      <text x="60" y="280" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="#F0F0FF">${escapeXml(title.substring(0, 40))}</text>
      ${title.length > 40 ? `<text x="60" y="340" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="#F0F0FF">${escapeXml(title.substring(40, 80))}</text>` : ''}
      <text x="60" y="450" font-family="Arial,sans-serif" font-size="22" fill="#5C6078">${topicsCount} topics · ${language} · AI Generated</text>
      <text x="60" y="500" font-family="Arial,sans-serif" font-size="18" fill="#6C47FF">coursbit.com</text>
    </svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (error) { next(error); }
};

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
