
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
          <p className="text-gray-600 mt-2">Last updated: January 2025</p>
        </div>

        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By participating in the Writory Poetry Contest, you agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not submit your poem.
            </p>

            <h2>2. Eligibility</h2>
            <ul>
              <li>Contest is open to poets of all ages and nationalities</li>
              <li>Participants must provide accurate personal information</li>
              <li>One email address per participant</li>
              <li>Free tier limited to one submission per month per participant</li>
            </ul>

            <h2>3. Submission Guidelines</h2>
            <ul>
              <li>Poems must be original work created by the submitter</li>
              <li>No plagiarism or copyright infringement will be tolerated</li>
              <li>Poems can be in any language and any style</li>
              <li>File formats accepted: PDF, DOC, DOCX (maximum 5MB)</li>
              <li>A recent photograph of the poet is required</li>
            </ul>

            <h2>4. Payment and Refunds</h2>
            <ul>
              <li>Payment is required for paid tiers (₹50, ₹100, ₹480)</li>
              <li>All payments are non-refundable once submission is completed</li>
              <li>Coupon codes are valid for the month they are issued</li>
              <li>Discount coupons cannot be combined with other offers</li>
            </ul>

            <h2>5. Judging and Results</h2>
            <ul>
              <li>Judging will be conducted by qualified literary professionals</li>
              <li>Results will be announced on the specified date</li>
              <li>Judges' decisions are final and binding</li>
              <li>Winners will be notified via email and published on our website</li>
            </ul>

            <h2>6. Prizes and Recognition</h2>
            <ul>
              <li>Winners receive certificates, social media recognition, and cash prizes</li>
              <li>Winning poems may be published on our platform and social media</li>
              <li>Winners grant permission for their work to be showcased</li>
            </ul>

            <h2>7. Intellectual Property</h2>
            <ul>
              <li>Poets retain copyright ownership of their submitted works</li>
              <li>By submitting, poets grant Writory limited rights to display and promote winning entries</li>
              <li>Writory respects intellectual property rights and expects the same from participants</li>
            </ul>

            <h2>8. Privacy and Data Protection</h2>
            <ul>
              <li>Personal information is collected for contest administration only</li>
              <li>Data will not be shared with third parties without consent</li>
              <li>See our Privacy Policy for detailed information handling practices</li>
            </ul>

            <h2>9. Disqualification</h2>
            <p>Participants may be disqualified for:</p>
            <ul>
              <li>Submitting plagiarized or non-original content</li>
              <li>Providing false information</li>
              <li>Violating any of these terms and conditions</li>
              <li>Inappropriate or offensive content</li>
            </ul>

            <h2>10. Limitation of Liability</h2>
            <p>
              Writory is not liable for any technical issues, lost submissions, or other circumstances 
              beyond our reasonable control that may affect contest participation.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              Writory reserves the right to modify these terms at any time. Participants will be 
              notified of significant changes via email or website announcement.
            </p>

            <h2>12. Contact Information</h2>
            <p>
              For questions about these Terms and Conditions, please contact us at{" "}
              <a href="mailto:writorycontest@gmail.com" className="text-green-600">writorycontest@gmail</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
