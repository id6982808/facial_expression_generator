
import React, { useState, useCallback } from 'react';
import { generateExpression } from './services/geminiService';
import type { GeneratedImage, OriginalImage } from './types';
import { EXPRESSIONS_TO_GENERATE } from './constants';

declare const JSZip: any;

const UploadIcon: React.FC = () => (
  <svg className="w-12 h-12 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);

const ImageUploader: React.FC<{ onImageUpload: (image: OriginalImage) => void }> = ({ onImageUpload }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload({ file, dataUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-400">PNG, JPG, WEBP (MAX. 10MB)</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
    <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
);

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleImageUpload = (image: OriginalImage) => {
    setOriginalImage(image);
    setGeneratedImages([]);
    setError(null);
    setProgress(0);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImages([]);
    setError(null);
    setProgress(0);
  }

  const handleGenerateExpressions = useCallback(async () => {
    if (!originalImage) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setProgress(0);
    
    const base64Data = originalImage.dataUrl.split(',')[1];
    const mimeType = originalImage.file.type;
    const totalExpressions = EXPRESSIONS_TO_GENERATE.length;
    let completedCount = 0;

    const promises = EXPRESSIONS_TO_GENERATE.map(expression =>
      generateExpression(base64Data, mimeType, expression)
        .then(newBase64 => {
          completedCount++;
          setProgress(Math.round((completedCount / totalExpressions) * 100));
          return { expression, base64: `data:image/png;base64,${newBase64}` };
        })
    );

    try {
      const results = await Promise.all(promises);
      setGeneratedImages(results);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during image generation.');
    } finally {
      setIsLoading(false);
    }
  }, [originalImage]);
  
  const handleDownloadAll = async () => {
    if (generatedImages.length === 0) return;
    
    const zip = new JSZip();
    generatedImages.forEach(img => {
        const base64Data = img.base64.split(',')[1];
        const fileName = `${img.expression.replace(/[\(\)]/g, '').replace(/\s+/g, '_')}.png`;
        zip.file(fileName, base64Data, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "character_expressions.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
            AI Facial Expression Generator
          </h1>
          <p className="mt-4 text-lg text-gray-400">Upload a character image to generate various facial expressions.</p>
        </header>

        {error && (
          <div className="my-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg text-center">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {!originalImage && <ImageUploader onImageUpload={handleImageUpload} />}

        {originalImage && (
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-semibold">Original Character</h2>
              <img src={originalImage.dataUrl} alt="Original character" className="max-w-xs w-full h-auto object-contain rounded-lg shadow-lg border-2 border-gray-700" />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleGenerateExpressions}
                disabled={isLoading}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
              >
                {isLoading ? 'Generating...' : 'Generate 8 Expressions'}
              </button>
               <button
                onClick={handleReset}
                className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300"
              >
                Upload New Image
              </button>
            </div>
          </div>
        )}

        {isLoading && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <LoadingSpinner />
              <p className="text-lg text-blue-300">Generating expressions... this may take a moment.</p>
              <div className="w-full max-w-md bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-gray-400">{progress}% complete</p>
            </div>
        )}
        
        {generatedImages.length > 0 && !isLoading && (
            <div className="mt-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Generated Expressions</h2>
                    <button 
                        onClick={handleDownloadAll}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-300 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        Download All (.zip)
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {generatedImages.map((image, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 group transition-transform duration-300 hover:scale-105 hover:border-blue-500">
                            <div className="aspect-square w-full bg-gray-900 flex items-center justify-center">
                                <img src={image.base64} alt={`Generated expression: ${image.expression}`} className="object-contain w-full h-full"/>
                            </div>
                            <div className="p-4">
                                <h3 className="text-center font-semibold text-gray-300 group-hover:text-white transition-colors">{image.expression}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
