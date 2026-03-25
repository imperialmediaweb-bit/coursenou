import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Certificate from '../models/Certificate';
import { certificateService } from '../services/certificateService';

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
    const certificates = await Certificate.find({ userId: req.user!._id })
      .populate('courseId', 'title');

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
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      throw new AppError('Certificate not found', 404);
    }

    if (certificate.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to download this certificate', 403);
    }

    const pdfBuffer = await certificateService.generateCertificatePDF(
      certificate.userName,
      certificate.courseName,
      certificate.issuedAt
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${encodeURIComponent(certificate.courseName)}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
