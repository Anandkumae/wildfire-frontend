import React, { useState, useCallback } from 'react';
import { Upload, X, FileImage, FileVideo } from 'lucide-react';

const FileUpload = ({ onFileSelect, accept, maxSize = 10 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size should be less than ${maxSize}MB`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={`glass-card p-8 border-2 border-dashed transition-all duration-300 ${
            dragActive ? 'border-fire-500 bg-fire-500/10' : 'border-white/20 hover:border-fire-500/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="w-16 h-16 text-fire-500 mb-4 animate-float" />
            <p className="text-lg font-semibold text-white mb-2">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-gray-400">
              Supports images (JPG, PNG) and videos (MP4, AVI) up to {maxSize}MB
            </p>
          </label>
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedFile.type.startsWith('image/') ? (
                <FileImage className="w-8 h-8 text-fire-500" />
              ) : (
                <FileVideo className="w-8 h-8 text-fire-500" />
              )}
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
          
          {preview && selectedFile.type.startsWith('image/') && (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
