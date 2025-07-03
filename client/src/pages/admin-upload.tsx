
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
  const [result, setResult] = useState<UploadResult | null>(null);

  // Check if user is admin
  const isAdmin = user?.email === 'shivaaymehra2@gmail.com';

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
          errors: data.errors || []
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
          errors: data.errors || []
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
        errors: [error.message || 'Unknown error']
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Admin CSV Upload</h1>
          <p className="text-gray-600">Upload AI evaluation results to update poem scores and status.</p>
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
                email,poemtitle,score,type,originality,emotion,structure,language,theme,status
              </code>
              <p className="text-blue-700 text-xs mt-2">
                Example: writorycontest@gmail.com,My Winter Poem,87,Human,23,24,17,18,5,Evaluated
              </p>
            </div>

            {/* Results Section */}
            {result && (
              <div className="space-y-4">
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                    <strong>{result.success ? 'Success:' : 'Error:'}</strong> {result.message}
                  </AlertDescription>
                </Alert>

                {result.success && result.processed > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Upload Summary</h3>
                    <p className="text-green-700">
                      Successfully processed <strong>{result.processed}</strong> records.
                    </p>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2">Errors Encountered</h3>
                    <ul className="text-red-700 text-sm space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
