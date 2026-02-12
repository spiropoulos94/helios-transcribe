'use client';

import { useState } from 'react';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  translations: {
    title?: string;
    subtitle?: string;
    name?: string;
    namePlaceholder?: string;
    email?: string;
    emailPlaceholder?: string;
    telephone?: string;
    telephonePlaceholder?: string;
    organization?: string;
    organizationPlaceholder?: string;
    message?: string;
    messagePlaceholder?: string;
    submit?: string;
    submitting?: string;
    success?: string;
    error?: string;
    close?: string;
  };
}

export default function ContactFormModal({ isOpen, onClose, translations: t }: ContactFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telephone: '',
    organization: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', telephone: '', organization: '', message: '' });

      // Close modal after 2 seconds on success
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(t.error || 'Something went wrong. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={t.close || 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {status === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {t.success || 'Thank you!'}
              </h3>
              <p className="text-slate-600">
                We'll be in touch soon.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {t.title || 'Request Access'}
              </h2>
              <p className="text-slate-600 mb-6">
                {t.subtitle || 'Tell us about your organization and we\'ll get back to you.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    {t.name || 'Name'} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t.namePlaceholder || "Your name"}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    {t.email || 'Email'} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t.emailPlaceholder || "you@example.com"}
                  />
                </div>

                <div>
                  <label htmlFor="telephone" className="block text-sm font-medium text-slate-700 mb-1">
                    {t.telephone || 'Telephone'}
                  </label>
                  <input
                    type="tel"
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t.telephonePlaceholder || "Your phone number (optional)"}
                  />
                </div>

                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1">
                    {t.organization || 'Organization'}
                  </label>
                  <input
                    type="text"
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t.organizationPlaceholder || "Your organization (optional)"}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                    {t.message || 'Message'}
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder={t.messagePlaceholder || "Tell us about your needs (optional)"}
                  />
                </div>

                {status === 'error' && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all"
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.submitting || 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t.submit || 'Send Request'}
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
