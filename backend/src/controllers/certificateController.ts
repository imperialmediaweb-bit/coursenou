import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

export const getCertificates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001') {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user!._id as string },
      include: { course: { select: { title: true } } },
    });

    res.status(200).json({ success: true, data: certificates });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const certificate = await prisma.certificate.findUnique({ where: { id: req.params.id } });
    if (!certificate) {
      throw new AppError('Certificate not found', 404);
    }

    // Printable HTML certificate — Puppeteer is unavailable on Railway,
    // so we render the certificate as a styled page the browser can
    // print/save as PDF (Ctrl+P), same approach as the course export.
    const esc = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const dateStr = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Certificate — ${esc(certificate.courseName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0F1117;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
.print-bar{background:linear-gradient(135deg,#6C47FF,#8B6FFF);color:#fff;padding:12px 24px;border-radius:12px;margin-bottom:24px;font-weight:600;font-size:14px}
.cert{width:100%;max-width:900px;aspect-ratio:1.414;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:24px;display:flex}
.inner{flex:1;background:#fff;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;padding:40px}
.frame{position:absolute;inset:14px;border:2px solid #e0e7ff;border-radius:10px;pointer-events:none}
.logo{font-size:16px;color:#6C47FF;font-weight:800;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px}
.title{font-size:34px;color:#1f2937;font-weight:800;margin:6px 0}
.sub{font-size:13px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:18px}
.name{font-size:32px;color:#4f46e5;font-style:italic;font-weight:700;border-bottom:2px solid #e0e7ff;padding-bottom:8px;margin:10px 0 16px}
.course{font-size:17px;color:#374151;max-width:560px;line-height:1.5}
.date{font-size:13px;color:#9ca3af;margin-top:22px}
.badge{position:absolute;bottom:28px;right:40px;width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#6C47FF,#8B6FFF);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;text-align:center;line-height:1.3}
@media print{body{background:#fff;padding:0}.print-bar{display:none}.cert{border-radius:0}}
@page{size:landscape;margin:0}
</style></head><body>
<div class="print-bar">Press <b>Ctrl+P</b> (Cmd+P on Mac) &rarr; Save as PDF to download your certificate</div>
<div class="cert"><div class="inner">
<div class="frame"></div>
<div class="logo">Coursbit</div>
<div class="title">Certificate of Completion</div>
<div class="sub">This certifies that</div>
<div class="name">${esc(certificate.userName)}</div>
<div class="course">has successfully completed the course<br><strong>&ldquo;${esc(certificate.courseName)}&rdquo;</strong></div>
<div class="date">Issued on ${dateStr}</div>
<div class="badge">Verified<br>Complete</div>
</div></div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (error) {
    next(error);
  }
};
