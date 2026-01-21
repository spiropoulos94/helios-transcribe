import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-8 text-center text-slate-400 text-sm">
      <p>
        Made with ❤️ by{' '}
        <a
          href="https://www.linkedin.com/in/nikos-spiropoulos-813167181/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 transition-colors"
        >
          Nikos
        </a>
      </p>
      <p className="mt-1">
        &copy; {new Date().getFullYear()} Helios Transcribe. Built with Gemini AI.
      </p>
    </footer>
  );
};
