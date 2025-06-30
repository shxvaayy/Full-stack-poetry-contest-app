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
          <p className="text-gray-600 mt-2">Welcome to Writory!</p>
        </div>

        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            <p className="text-gray-700 mb-6">
              These terms and conditions outline the rules and regulations for the use of Writory's website, 
              located at <a href="https://writory.onrender.com" className="text-green-600">https://writory.onrender.com</a>.
            </p>

            <p className="text-gray-700 mb-6">
              By accessing this website, we assume you accept these terms and conditions. Do not continue to use 
              Writory if you do not agree to take all of the terms and conditions stated on this page.
            </p>

            <h2>Terminology</h2>
            <p>
              The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and all Agreements:
              "Client", "You" and "Your" refers to you, the person logging on this website and compliant to the Company's terms. 
              "The Company", "Ourselves", "We", "Our" and "Us", refers to Writory. "Party", "Parties", or "Us", refers to both 
              the Client and Writory. All terms refer to the offer, acceptance and consideration of payment necessary to provide 
              the user our services in accordance with Indian law.
            </p>

            <h2>Cookies</h2>
            <p>
              We employ the use of cookies. By accessing Writory, you agree to use cookies in agreement with Writory's Privacy Policy.
              Cookies help enhance your experience and enable essential functionality.
            </p>

            <h2>License</h2>
            <p>
              Unless otherwise stated, Writory owns the intellectual property rights for all content on the site. All rights are reserved.
              You may access content from Writory for your personal use only, subject to restrictions in these terms.
            </p>

            <p>You must not:</p>
            <ul>
              <li>Republish material from Writory</li>
              <li>Sell, rent, or sub-license material</li>
              <li>Reproduce or duplicate content</li>
              <li>Redistribute content without permission</li>
            </ul>

            <h2>User Submissions</h2>
            <p>By submitting content (e.g., poems in PDF/image formats), you acknowledge and agree:</p>
            <ul>
              <li>You are the original author or have permission to share the content.</li>
              <li>You are not violating any third-party rights, including copyrights.</li>
              <li>You grant Writory a non-exclusive license to use and publish the submission on the platform or promotional materials (with credit).</li>
              <li>Submissions must not include offensive, obscene, or unlawful material.</li>
            </ul>

            <h2>Comments and Interactive Content</h2>
            <p>
              Certain areas of the website allow users to post comments or interact with content. Writory does not pre-review comments 
              and is not responsible for their content.
            </p>
            <p>We reserve the right to remove comments that are inappropriate, offensive, or violate these Terms.</p>
            <p>By posting comments, you confirm:</p>
            <ul>
              <li>You have the right to post the comment.</li>
              <li>It does not infringe any intellectual property rights.</li>
              <li>It is not defamatory, offensive, or unlawful.</li>
              <li>It does not promote commercial or illegal activity.</li>
            </ul>

            <h2>Hyperlinking to Our Website</h2>
            <p>The following may link to our website without prior written approval:</p>
            <ul>
              <li>Government agencies</li>
              <li>Search engines</li>
              <li>News outlets</li>
              <li>Online directories</li>
            </ul>
            <p>
              Other entities (e.g., educational, non-profit) may request approval. We reserve the right to deny or remove links 
              if they are misleading or inappropriate.
            </p>

            <h2>iFrames</h2>
            <p>
              You may not create frames around our website that alter the visual presentation or branding without written consent.
            </p>

            <h2>Content Liability</h2>
            <p>
              We are not responsible for any content appearing on external websites that link to Writory. You agree to defend us 
              against any claims arising from your site linking to ours.
            </p>

            <h2>User Data & Privacy</h2>
            <p>
              By using Writory, you may provide personal information including your name, email, phone number, and uploaded content.
              We store this data securely and use it strictly for the purpose of contest management, communication, and verification.
            </p>
            <p>
              Your data is never sold to third parties. You can request deletion by contacting: 
              <a href="mailto:writorycontest@gmail.com" className="text-green-600 ml-1">writorycontest@gmail.com</a>
            </p>

            <h2>Reservation of Rights</h2>
            <p>
              We reserve the right to request removal of any link to our website and to amend these terms at any time.
              By continuing to use the site, you agree to be bound by the current version of these Terms.
            </p>

            <h2>Removal of Content or Links</h2>
            <p>
              If you find offensive or incorrect content on our website, you are encouraged to contact us. We will consider requests 
              but are not obligated to act unless legally required.
            </p>

            <h2>Disclaimer</h2>
            <p>
              To the maximum extent permitted by law, Writory excludes all representations, warranties and conditions relating to 
              the website and its services. Nothing in this disclaimer will limit or exclude liability for death, personal injury, or fraud.
            </p>
            <p>
              As long as the website and services are provided free of charge, we are not liable for any loss or damage.
            </p>

            <h2>📩 Contact Information</h2>
            <p>
              If you have questions about these Terms, reach out to us at{" "}
              <a href="mailto:writorycontest@gmail.com" className="text-green-600">writorycontest@gmail.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
