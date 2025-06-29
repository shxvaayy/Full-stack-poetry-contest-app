
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-gray-900">
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  submit a poem, or contact us. This may include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Name and email address</li>
                  <li>Phone number (optional)</li>
                  <li>Submitted poems and related content</li>
                  <li>Payment information (processed securely)</li>
                  <li>Profile photos (optional)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Process contest submissions and payments</li>
                  <li>Communicate with you about the contest</li>
                  <li>Send notifications about contest results</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Information Sharing</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties, 
                  except as described in this policy:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>With your explicit consent</li>
                  <li>To process payments through secure payment processors</li>
                  <li>To comply with legal requirements</li>
                  <li>To protect our rights and safety</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Security</h2>
                <p>
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
                  over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Authentication</h2>
                <p>
                  We use Firebase Authentication to secure user accounts. Google's privacy practices 
                  apply to authentication data. We do not store your passwords directly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies and Tracking</h2>
                <p>
                  We use cookies and similar technologies to enhance your browsing experience, 
                  analyze site traffic, and personalize content. You can control cookie settings through your browser.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Withdraw consent where applicable</li>
                  <li>Port your data to another service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
                <p>
                  Our service is not intended for children under 13. We do not knowingly collect 
                  personal information from children under 13. If we become aware of such collection, 
                  we will delete the information immediately.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to Privacy Policy</h2>
                <p>
                  We may update this privacy policy from time to time. We will notify you of any changes 
                  by posting the new policy on this page and updating the effective date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
                <p>
                  If you have any questions about this privacy policy, please contact us through our 
                  contact page or email privacy@writory.com.
                </p>
              </section>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Last updated:</strong> December 2024
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
