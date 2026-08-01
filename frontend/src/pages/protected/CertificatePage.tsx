import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineDownload, HiOutlineAcademicCap } from 'react-icons/hi';
import api from '../../services/api';
import { Certificate } from '../../types';

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchCertificate();
  }, [id]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/certificates/${id}`);
      setCertificate(res.data);
    } catch {
      toast.error('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Opens the printable certificate page; the user saves it as PDF
    // via the browser's print dialog (works without server-side PDF tooling).
    window.open(`/api/certificates/${id}/download`, '_blank');
    toast.success('Certificate opened — press Ctrl+P to save as PDF');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Certificate not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Your Certificate</h1>

        {/* Certificate Preview */}
        <div className="bg-surface rounded-xl shadow-lg border-4 border-accent p-2 mb-8">
          <div className="border-2 border-indigo-200 rounded-lg p-8 sm:p-12">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 mb-8 text-center">
              <HiOutlineAcademicCap className="mx-auto h-12 w-12 text-white mb-2" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Certificate of Completion
              </h2>
              <p className="text-indigo-200 text-sm mt-1">CourseBit</p>
            </div>

            <div className="text-center space-y-6">
              <p className="text-muted text-lg">This certifies that</p>

              <h3 className="text-3xl sm:text-4xl font-bold text-white font-serif">
                {certificate.userName}
              </h3>

              <p className="text-muted text-lg">has successfully completed</p>

              <h4 className="text-xl sm:text-2xl font-semibold text-accent">
                {certificate.courseName}
              </h4>

              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted">
                  Issued on{' '}
                  {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-muted mt-1">
                  Certificate ID: {certificate._id}
                </p>
              </div>
            </div>

            {/* Decorative corners */}
            <div className="flex justify-between mt-8">
              <div className="w-16 h-0.5 bg-indigo-300" />
              <div className="w-16 h-0.5 bg-indigo-300" />
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="text-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-glow transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <HiOutlineDownload className="h-5 w-5" />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
