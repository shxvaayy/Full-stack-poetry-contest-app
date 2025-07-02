import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { Copy, Gift, Percent, Users, Settings } from 'lucide-react';

// Configuration for free entry tier - change this to false to disable free entries
const FREE_ENTRY_ENABLED = true;

export default function CouponCodesPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testCode, setTestCode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/coupons');
      const data = await response.json();

      // Filter out free entry coupons if disabled
      const filteredCoupons = FREE_ENTRY_ENABLED 
        ? data 
        : data.filter(coupon => coupon.discount_amount > 0);

      setCoupons(filteredCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: "Error",
        description: "Failed to load coupon codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Coupon code "${code}" copied to clipboard`,
    });
  };

  const testCoupon = async () => {
    if (!testCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code to test",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: testCode.trim() })
      });

      const data = await response.json();

      if (data.valid) {
        // Check if it's a free entry coupon and if free entries are disabled
        if (data.discount_amount === 0 && !FREE_ENTRY_ENABLED) {
          toast({
            title: "Coupon Unavailable",
            description: "Free entry coupons are currently disabled",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Valid Coupon!",
          description: data.discount_amount === 0 
            ? "Free entry coupon!" 
            : `Discount: ${data.discount_amount}%`,
        });
      } else {
        toast({
          title: "Invalid Coupon",
          description: data.error || "This coupon code is not valid",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing coupon:', error);
      toast({
        title: "Error",
        description: "Failed to test coupon code",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading coupon codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Coupon Codes
          </h1>
          <p className="text-gray-600">
            Available discount codes for poetry contest submissions
          </p>
        </div>

        {/* Configuration Status */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Settings className="h-5 w-5" />
              Configuration Status
            </CardTitle>
            <CardDescription className="text-blue-700">
              Current system configuration for coupon availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={FREE_ENTRY_ENABLED ? "default" : "secondary"}>
                {FREE_ENTRY_ENABLED ? "Free Entry Enabled" : "Free Entry Disabled"}
              </Badge>
              <span className="text-sm text-blue-700">
                {FREE_ENTRY_ENABLED 
                  ? "Free entry coupons are currently available" 
                  : "Free entry coupons are currently disabled"
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Test Coupon Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Test Coupon Code
            </CardTitle>
            <CardDescription>
              Enter a coupon code to test its validity and discount amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="test-code">Coupon Code</Label>
                <Input
                  id="test-code"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  placeholder="Enter coupon code..."
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={testCoupon} className="bg-purple-600 hover:bg-purple-700">
                  Test Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-purple-600">
                    {coupon.code}
                  </CardTitle>
                  <Badge variant={coupon.is_active ? "default" : "secondary"}>
                    {coupon.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  {coupon.discount_amount === 0 ? (
                    <span className="text-green-600 font-semibold">Free Entry</span>
                  ) : (
                    <span className="text-blue-600 font-semibold">
                      {coupon.discount_amount}% Discount
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Percent className="h-4 w-4" />
                    <span>
                      {coupon.discount_amount === 0 ? "Complete waiver" : `${coupon.discount_amount}% off submission fee`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>Valid for all submission tiers</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(coupon.code)}
                    className="w-full mt-4"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {coupons.length === 0 && (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Coupon Codes Available
            </h3>
            <p className="text-gray-600">
              {FREE_ENTRY_ENABLED 
                ? "Check back later for discount codes and special offers!"
                : "Free entry tier is currently disabled. Check back later for discount codes!"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}