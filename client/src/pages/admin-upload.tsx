import React, { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface UploadResult {
  success: boolean;
  message: string;
  processed: number;
  errors: string[];
}

export default function AdminUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    processed?: number;
    errors?: string[];
    updatedSubmissions?: Array<{
      id: number;
      email: string;
      poemTitle: string;
      poemFileUrl?: string;
      photoFileUrl?: string;
      score: number;
      status: string;
      isWinner: boolean;
      winnerPosition?: number;
    }>;
  } | null>(null);

  // Check if user is admin
  const adminEmails = [
    'shivaaymehra2@gmail.com',
    'bhavyaseth2005@gmail.com'
  ];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-gray-600">You need to be logged in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-semibold mb-2">Unauthorized</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/'}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      console.log('🚀 Starting CSV upload for file:', file.name);

      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        headers: {
          'X-User-Email': user?.email || '',
        },
        body: formData,
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Non-JSON response received');
        const textResponse = await response.text();
        console.error('❌ Response body:', textResponse.substring(0, 500));

        throw new Error('Server returned non-JSON response. Please check server logs.');
      }

      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          processed: data.processed || 0,
          errors: data.errors || [],
          updatedSubmissions: data.updatedSubmissions || []
        });

        toast({
          title: "Upload Successful",
          description: `Processed ${data.processed} records successfully.`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || data.message || 'Upload failed',
          processed: data.processed || 0,
          errors: data.errors || [],
          updatedSubmissions: data.updatedSubmissions || []
        });

        toast({
          title: "Upload Failed",
          description: data.error || data.message || 'An error occurred during upload.',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);

      let errorMessage = 'Network error occurred';
      if (error.message.includes('JSON')) {
        errorMessage = 'Server error - received invalid response format';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setResult({
        success: false,
        message: errorMessage,
        processed: 0,
        errors: [error.message || 'Unknown error'],
        updatedSubmissions: []
      });

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-800 mb-2 flex items-center justify-center">
              <FileSpreadsheet className="mr-2" size={32} />
              Admin CSV Upload
            </h1>
            <p className="text-lg text-gray-600">
              Upload AI evaluation results to update poem scores and status.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="mr-2" size={24} />
              CSV File Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-1"
                />
              </div>

              {file && (
                <Alert>
                  <Upload className="h-4 w-4" />
                  <AlertDescription>
                    Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2" size={20} />
                    Upload CSV
                  </>
                )}
              </Button>
            </div>

            {/* Expected Format Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Expected CSV Format</h3>
              <p className="text-blue-700 text-sm mb-2">
                The CSV file should contain the following columns:
              </p>
              <code className="text-xs bg-blue-100 p-2 rounded block">
                email,poemtitle,score,type,originality,emotion,structure,language,theme,status,winner
              </code>
              <p className="text-blue-700 text-xs mt-2">
                Example: writorycontest@gmail.com,My Winter Poem,87,Human,23,24,17,18,5,Evaluated,1
              </p>
              <p className="text-blue-700 text-xs mt-1">
                Winner column: Use "1", "2", "3" for 1st/2nd/3rd place, or "true"/"false" for winner status
              </p>
            </div>

            {/* Results Display */}
            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className={result.success ? "text-green-800" : "text-red-800"}>
                      {result.message}
                    </p>
                    {result.processed !== undefined && (
                      <p className="text-sm text-gray-600">
                        Records processed: {result.processed}
                      </p>
                    )}

                    {/* Show Updated Submissions with File Links */}
                    {result.updatedSubmissions && result.updatedSubmissions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-green-800 mb-2">
                          Updated Submissions (showing first 20):
                        </h4>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {result.updatedSubmissions.map((submission: any, index: number) => (
                            <div key={index} className="p-2 bg-white rounded border text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{submission.email}</p>
                                  <p className="text-gray-600">{submission.poemTitle}</p>
                                  <p className="text-green-600">Score: {submission.score} | Status: {submission.status}</p>
                                  {submission.isWinner && (
                                    <p className="text-yellow-600 font-medium">
                                      🏆 Winner {submission.winnerPosition ? `(Position ${submission.winnerPosition})` : ''}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right space-y-1">
                                  {submission.poemFileUrl && (
                                    <a 
                                      href={submission.poemFileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block text-blue-600 hover:text-blue-800 underline"
                                    >
                                      📄 View Poem
                                    </a>
                                  )}
                                  {submission.photoFileUrl && (
                                    <a 
                                      href={submission.photoFileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block text-blue-600 hover:text-blue-800 underline"
                                    >
                                      📸 View Photo
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {result.errors.map((error: string, index: number) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}