
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: January 2025</p>
        </div>

        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            <h2>1. Information We Collect</h2>
            
            <h3>Personal Information</h3>
            <ul>
              <li>Name (first and last)</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>Age (optional)</li>
              <li>Photograph (required for contest participation)</li>
            </ul>

            <h3>Submission Information</h3>
            <ul>
              <li>Poem title and content</li>
              <li>Submission tier selected</li>
              <li>Payment information (processed securely by third-party providers)</li>
              <li>Coupon codes used</li>
            </ul>

            <h3>Technical Information</h3>
            <ul>
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage patterns and preferences</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <ul>
              <li>To process contest submissions and payments</li>
              <li>To communicate about contest results and updates</li>
              <li>To provide customer support</li>
              <li>To improve our platform and services</li>
              <li>To showcase winning entries (with permission)</li>
              <li>To send periodic newsletters and contest announcements</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share information in these circumstances:</p>
            <ul>
              <li>With your explicit consent</li>
              <li>To process payments (with secure payment processors)</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in contest operations</li>
            </ul>

            <h2>4. Data Security</h2>
            <ul>
              <li>We implement industry-standard security measures</li>
              <li>Payment information is processed securely by certified providers</li>
              <li>Personal data is stored on secure servers</li>
              <li>Access to personal information is restricted to authorized personnel</li>
              <li>Regular security audits and updates are performed</li>
            </ul>

            <h2>5. Data Retention</h2>
            <ul>
              <li>Personal information is retained for the duration of the contest and 1 year after</li>
              <li>Winning entries may be retained longer for promotional purposes</li>
              <li>Payment records are kept as required by law</li>
              <li>You may request data deletion at any time (subject to legal requirements)</li>
            </ul>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct or update your information</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
              <li>File a complaint with data protection authorities</li>
            </ul>

            <h2>7. Cookies and Tracking</h2>
            <ul>
              <li>We use cookies to improve user experience</li>
              <li>Essential cookies are required for site functionality</li>
              <li>Analytics cookies help us understand usage patterns</li>
              <li>You can manage cookie preferences in your browser</li>
            </ul>

            <h2>8. Third-Party Services</h2>
            <p>Our platform integrates with:</p>
            <ul>
              <li>Payment processors (Razorpay, PayPal, Stripe)</li>
              <li>Email service providers</li>
              <li>Analytics services</li>
              <li>Cloud storage providers</li>
            </ul>
            <p>These services have their own privacy policies and security measures.</p>

            <h2>9. International Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2>10. Children's Privacy</h2>
            <p>
              While our contest is open to all ages, participants under 18 should have parental 
              consent before submitting personal information.
            </p>

            <h2>11. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Significant changes will be 
              communicated via email or website notice.
            </p>

            <h2>12. Contact Us</h2>
            <p>For privacy-related questions or to exercise your rights, contact us at:</p>
            <ul>
              <li>Email: <a href="mailto:privacy@writory.com" className="text-green-600">privacy@writory.com</a></li>
              <li>Address: [Your business address]</li>
              <li>Phone: [Your contact number]</li>
            </ul>

            <h2>13. Consent</h2>
            <p>
              By using our platform and submitting to the contest, you consent to the collection 
              and use of your information as described in this Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
