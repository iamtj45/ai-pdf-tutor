'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // useChat hook handles streaming and message history automatically!
 const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
  api: '/api/chat',
  streamProtocol: 'text',   // ← add this line
  onError: (err) => {
    console.error('Chat error:', err);
  },
});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setUploadResult(data);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({ success: false, error: 'Failed to upload PDF' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-2">
            📚 AI PDF Tutor
          </h1>
          <p className="text-gray-600">
            Upload a PDF and chat with it
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. Upload PDF</h2>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
            >
              {uploading ? 'Processing...' : 'Upload & Process PDF'}
            </button>
          </form>

          {uploadResult && (
            <div className={`mt-4 p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {uploadResult.success 
                ? `✅ Success! Processed ${uploadResult.data?.totalChunks} chunks from ${uploadResult.data?.totalPages} pages` 
                : `❌ ${uploadResult.error}`}
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">2. Ask Questions</h2>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
              Error: {error.message}
            </div>
          )}

          {/* Messages Display */}
          <div className="mb-4 space-y-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Ask a question about your PDF...
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">
                      {message.role === 'user' ? 'You' : 'AI'}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
  value={input}
  onChange={handleInputChange}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }}
  placeholder="What would you like to know about the document?"
  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
  rows={3}
  disabled={isLoading || !uploadResult?.success}
/>

<button
  type="submit"
  disabled={!input.trim() || isLoading || !uploadResult?.success}
  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
>
  {isLoading ? 'AI is thinking...' : !uploadResult?.success ? 'Upload a PDF first' : 'Send Question'}
</button>
          </form>
        </div>

      </div>
    </div>
  );
}