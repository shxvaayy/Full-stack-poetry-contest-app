import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-gray-900">
              Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                <p>
                  By participating in the WRITORY Poetry Contest, you agree to be bound by these Terms and Conditions. 
                  If you do not agree to these terms, please do not participate in the contest.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Contest Eligibility</h2>
                <p>
                  The contest is open to poets worldwide. Participants must be at least 13 years old or have parental consent. 
                  Employees of WRITORY and their immediate family members are not eligible to participate.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Submission Guidelines</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All poems must be original work of the participant</li>
                  <li>Poems must not exceed 50 lines</li>
                  <li>Only one submission per participant per month</li>
                  <li>Submissions must be in English</li>
                  <li>Plagiarized content will result in immediate disqualification</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Entry Fees and Tiers</h2>
                <p>
                  Contest offers multiple entry tiers with different fee structures. All fees are non-refundable. 
                  Payment must be completed before the submission deadline.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Judging and Awards</h2>
                <p>
                  Poems will be judged based on creativity, originality, and literary merit. 
                  Judges' decisions are final and binding. Winners will be announced by the last day of each month.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
                <p>
                  Participants retain copyright to their submitted poems. By submitting, you grant WRITORY 
                  a non-exclusive license to publish and promote winning entries.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
                <p>
                  WRITORY shall not be liable for any damages arising from participation in the contest. 
                  Participation is at your own risk.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Changes to Terms</h2>
                <p>
                  WRITORY reserves the right to modify these terms at any time. 
                  Continued participation constitutes acceptance of modified terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact Information</h2>
                <p>
                  For questions regarding these terms, please contact us through our contact page or email support@writory.com.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
