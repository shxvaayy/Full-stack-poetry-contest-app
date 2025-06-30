
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    processedCount?: number;
  } | null>(null);

  // Admin access control
  if (!user || user.email !== 'shivaaymehra2@gmail.com') {
    navigate('/');
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadResult(null);
    } else {
      alert('Please select a valid CSV file.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first.');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/admin/upload-results', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          processedCount: result.processedCount,
        });
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('csv-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Upload failed',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'Network error during upload',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Admin: Upload AI Results
            </CardTitle>
            <p className="text-sm text-gray-600">
              Upload the CSV file containing AI evaluation results to update user poem scores.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CSV Format Info */}
            <Alert>
              <AlertDescription>
                <strong>Expected CSV format:</strong><br />
                email,title,score,type,originality,emotion,structure,language,theme,status<br />
                <em>Example: shivay@gmail.com,My Winter Poem,87,Human,23,24,17,18,5,Evaluated</em>
              </AlertDescription>
            </Alert>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {file && (
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing CSV...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Process Results
                  </>
                )}
              </Button>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <Alert className={uploadResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <AlertDescription className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                    {uploadResult.message}
                    {uploadResult.processedCount && (
                      <span className="block mt-1">
                        Successfully processed {uploadResult.processedCount} poem results.
                      </span>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Navigation */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/profile')}
                className="w-full"
              >
                Back to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
