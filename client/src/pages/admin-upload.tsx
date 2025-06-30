
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function AdminUploadPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [uploadStats, setUploadStats] = useState<{ processed: number; updated: number; errors: number } | null>(null);

  // Check if user is authorized admin
  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }

    if (user.email !== 'shivaaymehra2@gmail.com') {
      setLocation('/');
      return;
    }
  }, [user, setLocation]);

  // Don't render anything if not authorized
  if (!user || user.email !== 'shivaaymehra2@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You are not authorized to access this page.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setMessage({ type: 'error', text: 'Please select a valid CSV file.' });
        return;
      }
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a CSV file first.' });
      return;
    }

    setUploading(true);
    setMessage(null);
    setUploadStats(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/admin/upload-scores', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'CSV uploaded and processed successfully!' });
        setUploadStats(result.stats);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('csv-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed. Please try again.' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin CSV Upload</h1>
          <p className="text-gray-600">Upload AI-generated CSV files to update poem scores and results.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2" size={20} />
              Upload AI Results CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="csv-file" className="text-sm font-medium text-gray-700">
                Select CSV File
              </label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Expected format: email,title,score,type,originality,emotion,structure,language,theme,status
              </p>
            </div>

            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Selected file: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 
                               message.type === 'success' ? 'border-green-200 bg-green-50' : 
                               'border-blue-200 bg-blue-50'}>
                {message.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600" /> :
                 message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                 <FileText className="h-4 w-4 text-blue-600" />}
                <AlertDescription className={
                  message.type === 'error' ? 'text-red-700' :
                  message.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {uploadStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Upload Statistics</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Processed:</span>
                    <span className="font-bold text-green-900 ml-1">{uploadStats.processed}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Updated:</span>
                    <span className="font-bold text-green-900 ml-1">{uploadStats.updated}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Errors:</span>
                    <span className="font-bold text-green-900 ml-1">{uploadStats.errors}</span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing CSV...
                </>
              ) : (
                <>
                  <Upload className="mr-2" size={16} />
                  Upload and Process CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Expected CSV Headers:</h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  email,title,score,type,originality,emotion,structure,language,theme,status
                </code>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Example Row:</h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  shivay@gmail.com,My Winter Poem,87,Human,23,24,17,18,5,Evaluated
                </code>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Field Descriptions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>email:</strong> User's email address (used to match user)</li>
                  <li><strong>title:</strong> Poem title (used to match specific poem)</li>
                  <li><strong>score:</strong> Overall score out of 100</li>
                  <li><strong>type:</strong> Human, AI, or Copied</li>
                  <li><strong>originality:</strong> Score out of 25</li>
                  <li><strong>emotion:</strong> Score out of 25</li>
                  <li><strong>structure:</strong> Score out of 20</li>
                  <li><strong>language:</strong> Score out of 20</li>
                  <li><strong>theme:</strong> Score out of 10</li>
                  <li><strong>status:</strong> Evaluated, Rejected, etc.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
