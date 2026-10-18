import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockApi } from '../../lib/api/mockAdapter';
import type { DocumentStatusResponse } from '../../lib/api/types';
import {
  UploadCloud,
  FileText,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Image,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export interface UploadedDocItem {
  id: string;
  name: string;
  size: number;
  type: 'application/pdf' | 'image/png' | 'image/jpeg';
  status: 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'FAILED';
  progress: number;
  uploadedAt: string;
  extractedFactIds: string[];
  errorMessage?: string;
}

interface DocumentUploadZoneProps {
  encounterId?: string;
  onDocumentExtracted?: (documentId: string, extractedFactIds: string[]) => void;
  onViewDocument?: (doc: UploadedDocItem) => void;
  maxSizeBytes?: number; // default 10MB
  initialDocuments?: UploadedDocItem[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  encounterId = 'enc_demo_001',
  onDocumentExtracted,
  onViewDocument,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  initialDocuments = [
    {
      id: 'doc_synth_rx_01',
      name: 'St. Jude Pharmacy Refill Order.pdf',
      size: 1024 * 1024 * 1.8,
      type: 'application/pdf',
      status: 'EXTRACTED',
      progress: 100,
      uploadedAt: '2026-10-18T08:20:00Z',
      extractedFactIds: ['fact_003'],
    },
    {
      id: 'doc_synth_referral_02',
      name: 'Cardiology Referral Note & ECG.pdf',
      size: 1024 * 1024 * 3.2,
      type: 'application/pdf',
      status: 'EXTRACTED',
      progress: 100,
      uploadedAt: '2026-10-18T08:22:00Z',
      extractedFactIds: ['fact_005'],
    },
  ],
}) => {
  const [documents, setDocuments] = useState<UploadedDocItem[]>(initialDocuments);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFile = async (file: File) => {
    setUploadError(null);

    // 1. Supported Types Validation
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        `Unsupported file type (${file.type || 'unknown'}). Please upload a PDF, PNG, or JPEG file.`
      );
      return;
    }

    // 2. Max File Size Validation (10MB)
    if (file.size > maxSizeBytes) {
      setUploadError(
        `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${formatFileSize(maxSizeBytes)}.`
      );
      return;
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newDoc: UploadedDocItem = {
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type as 'application/pdf' | 'image/png' | 'image/jpeg',
      status: 'UPLOADED',
      progress: 25,
      uploadedAt: new Date().toISOString(),
      extractedFactIds: [],
    };

    setDocuments((prev) => [newDoc, ...prev]);

    try {
      // Send upload metadata to mockApi
      const res: DocumentStatusResponse = await mockApi.uploadDocument(encounterId, {
        filename: file.name,
        mime_type: file.type as 'application/pdf' | 'image/png' | 'image/jpeg',
        file_size_bytes: file.size,
      });

      // Update progress to processing
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, progress: 65, status: 'PROCESSING' } : d
        )
      );

      // Simulate extraction completion
      setTimeout(async () => {
        const statusRes = await mockApi.getDocumentStatus(res.data.document_id);
        const extractedIds = statusRes.data.extracted_fact_ids.length > 0
          ? statusRes.data.extracted_fact_ids
          : ['fact_003'];

        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  progress: 100,
                  status: 'EXTRACTED',
                  extractedFactIds: extractedIds,
                }
              : d
          )
        );

        if (onDocumentExtracted) {
          onDocumentExtracted(docId, extractedIds);
        }
      }, 1000);
    } catch {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                status: 'FAILED',
                errorMessage: 'Upload service communication failed. Please retry.',
              }
            : d
        )
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // reset input so the same file can be re-selected if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRetry = (doc: UploadedDocItem) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: 'PROCESSING', progress: 50, errorMessage: undefined } : d))
    );
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, status: 'EXTRACTED', progress: 100, extractedFactIds: ['fact_003'] }
            : d
        )
      );
    }, 800);
  };

  const handleRemove = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <Card className="shadow-lg border-white/[0.08] bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl overflow-hidden" data-testid="document-upload-zone">
      <CardHeader className="pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-serif text-white font-normal tracking-tight">
                Clinical Document Upload
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Upload prior referrals, lab reports, or medication bottles for multimodal OCR extraction
              </CardDescription>
            </div>
          </div>
          <Badge variant="neutral" className="text-xs bg-white/[0.05] border-white/10 text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            HIPAA-Redacted Zone
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Drag & Drop Zone */}
        <div
          role="region"
          aria-label="File upload drop area"
          data-testid="drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-500/30'
              : 'border-white/15 hover:border-cyan-400/50 hover:bg-white/[0.04] bg-white/[0.015]'
          }`}
        >
          <input
            ref={fileInputRef}
            data-testid="file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Drag and drop your clinical documents, or{' '}
                <span className="text-cyan-400 underline font-mono">browse files</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: <strong>PDF, PNG, JPG</strong> • Maximum size: <strong>10MB</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Upload Error Alert */}
        {uploadError && (
          <div
            role="alert"
            data-testid="upload-error-alert"
            className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-xl text-xs flex items-start space-x-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Upload Error</span>
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-rose-300 hover:text-white text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Uploaded Documents List */}
        <div className="space-y-2.5" data-testid="uploaded-documents-list">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
            <span>Uploaded Documents ({documents.length})</span>
            <span>OCR & Context Fact Status</span>
          </div>

          {documents.length === 0 ? (
            <div
              data-testid="no-documents-placeholder"
              className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.015] text-slate-500 text-xs"
            >
              No documents uploaded for this encounter yet.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                data-testid={`document-item-${doc.id}`}
                className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-cyan-400/40 transition-all"
              >
                {/* Doc Info */}
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    {doc.type === 'application/pdf' ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <Image className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5 font-mono">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  {doc.status === 'EXTRACTED' && (
                    <Badge variant="success" className="text-xs font-semibold">
                      <FileCheck className="w-3 h-3 mr-1" />
                      Extracted ({doc.extractedFactIds.length} facts)
                    </Badge>
                  )}

                  {doc.status === 'PROCESSING' && (
                    <Badge variant="warning" className="text-xs font-semibold animate-pulse">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      OCR Ingestion...
                    </Badge>
                  )}

                  {doc.status === 'UPLOADED' && (
                    <Badge variant="info" className="text-xs font-semibold">
                      Uploaded ({doc.progress}%)
                    </Badge>
                  )}

                  {doc.status === 'FAILED' && (
                    <Badge variant="error" className="text-xs font-semibold">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Extraction Failed
                    </Badge>
                  )}

                  {/* Actions */}
                  {doc.status === 'EXTRACTED' && onViewDocument && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDocument(doc)}
                      data-testid={`inspect-doc-btn-${doc.id}`}
                      className="text-xs h-8 px-2.5 text-cyan-300 hover:text-white border-cyan-500/30 hover:bg-cyan-500/10"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Source
                    </Button>
                  )}

                  {doc.status === 'FAILED' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(doc)}
                      data-testid={`retry-doc-btn-${doc.id}`}
                      className="text-xs h-8 px-2.5 text-amber-300 hover:text-white border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Retry
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(doc.id)}
                    data-testid={`remove-doc-btn-${doc.id}`}
                    aria-label={`Remove document ${doc.name}`}
                    className="text-xs h-8 w-8 p-0 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
