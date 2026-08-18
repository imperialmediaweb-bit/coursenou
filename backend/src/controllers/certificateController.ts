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

/**
 * A single certificate.
 *
 * The certificate page has always requested this, but no such route existed —
 * the request fell through to the API's 404 handler, so opening a certificate
 * showed "Certificate not found" no matter what. Public by unguessable cuid,
 * matching the download route, so a shared link works for the recipient too.
 */
export const getCertificateById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Deliberately readable by anyone holding the id: a certificate is a
    // shareable achievement, the id is an unguessable cuid, and the printable
    // page is opened with window.open, which cannot send an auth header.
    //
    // Selected rather than returned whole, though. The row carries the account
    // id of the person who earned it, and that is not part of the achievement.
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        courseName: true,
        userName: true,
        issuedAt: true,
        downloadUrl: true,
        course: { select: { title: true } },
      },
    });

    if (!certificate) {
      throw new AppError('Certificate not found', 404);
    }

    res.status(200).json({ success: true, data: certificate });
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

    // --- Theme selection by course subject -------------------------------
    // The certificate re-skins itself to match the course domain so a
    // chiropractic diploma doesn't look like a coding bootcamp badge.
    type Theme = {
      key: string; paper: string; ink: string; inkSoft: string;
      accent: string; accentLight: string; accentDeep: string;
      brandA: string; brandB: string; texture: string;
    };
    const THEMES: Record<string, Theme> = {
      classic: { key: 'classic', paper: '#FDFBF6', ink: '#1B2A4A', inkSoft: '#5A6B87',
        accent: '#B08D3F', accentLight: '#D4B366', accentDeep: '#8E6F2C',
        brandA: '#6C47FF', brandB: '#8B6FFF', texture: 'rgba(27,42,74,.04)' },
      medical: { key: 'medical', paper: '#FAFDFC', ink: '#0F3B39', inkSoft: '#4A7B78',
        accent: '#12897F', accentLight: '#3FB3A6', accentDeep: '#0B6660',
        brandA: '#12897F', brandB: '#3FB3A6', texture: 'rgba(15,59,57,.04)' },
      tech: { key: 'tech', paper: '#F8F9FE', ink: '#191B33', inkSoft: '#5A5E85',
        accent: '#5B4BD6', accentLight: '#8B7BF0', accentDeep: '#3F32A8',
        brandA: '#6C47FF', brandB: '#8B6FFF', texture: 'rgba(25,27,51,.04)' },
      business: { key: 'business', paper: '#FCFBF9', ink: '#232323', inkSoft: '#6A655E',
        accent: '#9A6B34', accentLight: '#C39359', accentDeep: '#734E24',
        brandA: '#9A6B34', brandB: '#C39359', texture: 'rgba(35,35,35,.04)' },
      creative: { key: 'creative', paper: '#FFFCF8', ink: '#3A1F44', inkSoft: '#7B5F82',
        accent: '#C2557A', accentLight: '#E0839F', accentDeep: '#9B3D5D',
        brandA: '#C2557A', brandB: '#8B6FFF', texture: 'rgba(58,31,68,.04)' },
    };
    const SUBJECTS: Array<[string, string[]]> = [
      ['medical', ['chiropract','health','medic','nurs','anatomy','therapy','wellness','nutrition','fitness','dental','pharma','yoga','mental','first aid','care']],
      ['tech', ['program','python','javascript','java','code','coding','software','develop','web','data','machine learning','ai ','artificial','cyber','cloud','network','database','engineer','react','devops']],
      ['business', ['business','marketing','finance','account','sales','management','entrepreneur','leadership','economic','invest','strategy','project management','hr ','real estate']],
      ['creative', ['design','art','photo','music','writing','creative','draw','paint','video','film','fashion','ux','ui ','graphic','craft']],
    ];
    const subject = certificate.courseName.toLowerCase();
    const themeKey =
      SUBJECTS.find(([, words]) => words.some((w) => subject.includes(w)))?.[0] || 'classic';
    const t = THEMES[themeKey];

    const verifyId = certificate.id
      .slice(-12).toUpperCase().replace(/(.{4})/g, '$1-').replace(/-$/, '');

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Certificate of Completion — ${esc(certificate.courseName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Pinyon+Script&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --ink:${t.ink};
  --ink-soft:${t.inkSoft};
  --accent:${t.accent};
  --accent-light:${t.accentLight};
  --accent-deep:${t.accentDeep};
  --paper:${t.paper};
  --brand-a:${t.brandA};
  --brand-b:${t.brandB};
}
body{
  background:#2A2D3A;min-height:100vh;
  display:flex;flex-direction:column;align-items:center;
  padding:28px 16px 48px;font-family:'Inter',sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.bar{
  display:flex;align-items:center;gap:10px;background:#fff;color:#1B2A4A;
  padding:12px 22px;border-radius:999px;margin-bottom:26px;
  font-size:13.5px;font-weight:500;box-shadow:0 8px 30px rgba(0,0,0,.25);
}
.bar b{font-weight:700}
.bar .kbd{display:inline-block;background:#1B2A4A;color:#fff;border-radius:5px;
  padding:2px 7px;font-size:12px;font-weight:600;letter-spacing:.3px}

.sheet{position:relative;width:1122px;height:793px;background:var(--paper);
  box-shadow:0 30px 80px rgba(0,0,0,.45);overflow:hidden}
.sheet::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.5;
  background-image:
    repeating-linear-gradient(45deg,${t.accent}0D 0 1px,transparent 1px 9px),
    repeating-linear-gradient(-45deg,${t.texture} 0 1px,transparent 1px 9px)}
.sheet::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(circle at 0% 0%,${t.accent}1A,transparent 32%),
    radial-gradient(circle at 100% 100%,${t.brandB}14,transparent 32%)}

.frame{position:absolute;inset:26px;border:2.5px solid var(--accent)}
.frame-inner{position:absolute;inset:34px;border:1px solid ${t.accent}8C}

.content{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;
  align-items:center;padding:64px 96px 56px;text-align:center}

.brand{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.brand .mark{width:26px;height:26px;border-radius:7px;
  background:linear-gradient(135deg,var(--brand-a),var(--brand-b));
  display:flex;align-items:center;justify-content:center;color:#fff;
  font-weight:700;font-size:13px}
.brand .name{font-weight:600;font-size:15px;letter-spacing:.34em;
  text-transform:uppercase;color:var(--ink)}

.eyebrow{font-size:10.5px;font-weight:500;letter-spacing:.42em;
  text-transform:uppercase;color:var(--accent);margin-top:14px}

h1{font-family:'Cormorant Garamond',serif;font-size:62px;font-weight:600;
  color:var(--ink);line-height:1.04;letter-spacing:.01em;margin-top:6px}

.rule{display:flex;align-items:center;gap:12px;margin:18px 0 22px;width:330px}
.rule i{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.rule span{width:7px;height:7px;background:var(--accent);transform:rotate(45deg);flex:none}

.presented{font-family:'Cormorant Garamond',serif;font-style:italic;
  font-size:19px;color:var(--ink-soft)}
.recipient{font-family:'Pinyon Script',cursive;font-size:68px;color:var(--ink);
  line-height:1.18;margin:6px 0 4px;padding:0 20px}
.recipient-rule{width:460px;height:1px;
  background:linear-gradient(90deg,transparent,${t.accent}BF,transparent);margin-bottom:22px}

.for-completing{font-size:12px;font-weight:500;letter-spacing:.2em;
  text-transform:uppercase;color:var(--ink-soft)}
.course{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:31px;
  color:var(--ink);margin-top:9px;max-width:760px;line-height:1.28}

.footer{position:absolute;left:96px;right:96px;bottom:66px;
  display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.sig{width:230px;text-align:center}
.sig .line{height:1px;background:var(--ink);opacity:.55;margin-bottom:7px}
.sig .label{font-size:9.5px;font-weight:500;letter-spacing:.19em;
  text-transform:uppercase;color:var(--ink-soft)}
.sig .val{font-family:'Cormorant Garamond',serif;font-size:16px;
  color:var(--ink);margin-bottom:5px}
.sig .script{font-family:'Pinyon Script',cursive;font-size:27px;
  color:var(--ink);line-height:1;margin-bottom:4px}

.seal{position:relative;width:118px;height:118px;flex:none;margin-bottom:2px}
.ribbon{position:absolute;top:88px;left:50%;transform:translateX(-50%);display:flex;gap:5px}
.ribbon i{display:block;width:15px;height:34px;
  background:linear-gradient(180deg,var(--brand-b),var(--brand-a));
  clip-path:polygon(0 0,100% 0,100% 100%,50% 76%,0 100%)}
.ribbon i:first-child{transform:rotate(-9deg)}
.ribbon i:last-child{transform:rotate(9deg)}

.verify{position:absolute;left:0;right:0;bottom:30px;font-size:9px;
  letter-spacing:.13em;color:${t.ink}6B;text-transform:uppercase;text-align:center}
.verify b{color:${t.ink}9E;font-weight:600;letter-spacing:.16em}

@media print{
  @page{size:A4 landscape;margin:0}
  body{background:#fff;padding:0;display:block}
  .bar{display:none}
  .sheet{box-shadow:none;width:100%;height:100vh}
}
</style></head>
<body>

<div class="bar">
  <span>Press <span class="kbd">Ctrl</span> + <span class="kbd">P</span> &rarr; <b>Save as PDF</b> to download your certificate</span>
</div>

<div class="sheet">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  ${[
    'top:34px;left:34px',
    'top:34px;right:34px;transform:scaleX(-1)',
    'bottom:34px;left:34px;transform:scaleY(-1)',
    'bottom:34px;right:34px;transform:scale(-1)',
  ].map((pos) => `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" style="position:absolute;${pos};z-index:2">
    <path d="M4 44C4 22 22 4 44 4" stroke="${t.accent}" stroke-width="1.1" opacity=".85"/>
    <path d="M4 62C4 30 30 4 62 4" stroke="${t.accent}" stroke-width=".6" opacity=".45"/>
    <circle cx="4" cy="4" r="3.2" fill="${t.accent}"/>
    <path d="M14 30c8-9 16-9 24-16" stroke="${t.accent}" stroke-width=".6" opacity=".35"/>
  </svg>`).join('')}

  <div class="content">
    <div class="brand"><div class="mark">C</div><div class="name">Coursbit</div></div>
    <div class="eyebrow">Certificate of Completion</div>
    <h1>Certificate</h1>
    <div class="rule"><i></i><span></span><i></i></div>
    <div class="presented">This is to certify that</div>
    <div class="recipient">${esc(certificate.userName)}</div>
    <div class="recipient-rule"></div>
    <div class="for-completing">has successfully completed</div>
    <div class="course">${esc(certificate.courseName)}</div>
  </div>

  <div class="footer">
    <div class="sig">
      <div class="val">${dateStr}</div>
      <div class="line"></div>
      <div class="label">Date of Completion</div>
    </div>

    <div class="seal">
      <div class="ribbon"><i></i><i></i></div>
      <svg width="118" height="118" viewBox="0 0 118 118" fill="none" style="position:relative;z-index:2">
        <defs><linearGradient id="sealG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${t.accentLight}"/>
          <stop offset="52%" stop-color="${t.accent}"/>
          <stop offset="100%" stop-color="${t.accentDeep}"/>
        </linearGradient></defs>
        <circle cx="59" cy="52" r="41" fill="url(#sealG)"/>
        <circle cx="59" cy="52" r="41" fill="none" stroke="${t.accentDeep}" stroke-width="1"/>
        <circle cx="59" cy="52" r="34" fill="none" stroke="${t.paper}" stroke-width="1.1" opacity=".75"/>
        <circle cx="59" cy="52" r="30" fill="none" stroke="${t.paper}" stroke-width=".5" opacity=".45"/>
        <path d="M59 33l5.1 10.9 11.6 1.6-8.5 8.1 2.1 11.8L59 60.1 47.7 65.4l2.1-11.8-8.5-8.1 11.6-1.6z" fill="${t.paper}" opacity=".95"/>
        <text x="59" y="79" text-anchor="middle" font-family="Inter,sans-serif" font-size="7.4" font-weight="600" letter-spacing="1.5" fill="${t.paper}">VERIFIED</text>
      </svg>
    </div>

    <div class="sig">
      <div class="script">Coursbit</div>
      <div class="line"></div>
      <div class="label">Authorized Signature</div>
    </div>
  </div>

  <div class="verify">
    Certificate ID <b>${verifyId}</b> &nbsp;&middot;&nbsp; Verify at coursbit.com
  </div>
</div>

</body></html>`;


    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (error) {
    next(error);
  }
};
