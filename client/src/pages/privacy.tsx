import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function PrivacyPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (user) {
      window.history.back();
    } else {
      // If user is not authenticated, redirect to login (which will show AuthPage)
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: June 30, 2025</p>
        </div>

        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            <p>
              This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information 
              when You use the Service and tells You about Your privacy rights and how the law protects You.
            </p>
            <p>
              We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and 
              use of information in accordance with this Privacy Policy. This Privacy Policy has been created with the help of the{" "}
              <a href="https://www.termsfeed.com/privacy-policy-generator/" target="_blank" className="text-green-600">
                Privacy Policy Generator
              </a>.
            </p>

            <h2>Interpretation and Definitions</h2>
            
            <h3>Interpretation</h3>
            <p>
              The words of which the initial letter is capitalized have meanings defined under the following conditions. 
              The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
            </p>

            <h3>Definitions</h3>
            <p>For the purposes of this Privacy Policy:</p>
            <ul>
              <li>
                <strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.
              </li>
              <li>
                <strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, 
                where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote 
                for election of directors or other managing authority.
              </li>
              <li>
                <strong>Application</strong> refers to Writory Poetry Contest, the software program provided by the Company.
              </li>
              <li>
                <strong>Company</strong> (referred to as either "the Company", "we", "us" or "our") refers to Writory Poetry Contest.
              </li>
              <li>
                <strong>Country</strong> refers to: India
              </li>
              <li>
                <strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.
              </li>
              <li>
                <strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.
              </li>
              <li>
                <strong>Service</strong> refers to the Application.
              </li>
              <li>
                <strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company.
              </li>
              <li>
                <strong>Third-party Social Media Service</strong> refers to any website or social network website through which 
                a User can log in or create an account to use the Service.
              </li>
              <li>
                <strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service 
                or from the Service infrastructure itself.
              </li>
              <li>
                <strong>You</strong> refers to the individual accessing or using the Service, or the company, or other legal 
                entity on behalf of which such individual is accessing or using the Service.
              </li>
            </ul>

            <h2>Collecting and Using Your Personal Data</h2>
            
            <h3>Types of Data Collected</h3>
            
            <h4>Personal Data</h4>
            <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
            <ul>
              <li>Email address</li>
              <li>First name and last name</li>
              <li>Phone number</li>
              <li>Address, State, Province, ZIP/Postal code, City</li>
              <li>Usage Data</li>
            </ul>

            <h4>Usage Data</h4>
            <p>
              Usage Data is collected automatically when using the Service. Usage Data may include information such as Your Device's 
              Internet Protocol address, browser type, browser version, the pages of our Service that You visit, the time and date 
              of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
            </p>

            <h3>Use of Your Personal Data</h3>
            <p>The Company may use Personal Data for the following purposes:</p>
            <ul>
              <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
              <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</li>
              <li><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased.</li>
              <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
              <li><strong>To provide You with news, special offers and general information</strong> about other goods, services and events which we offer.</li>
              <li><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</li>
            </ul>

            <h3>Retention of Your Personal Data</h3>
            <p>
              The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. 
              We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations, resolve disputes, 
              and enforce our legal agreements and policies.
            </p>

            <h3>Transfer of Your Personal Data</h3>
            <p>
              Your information, including Personal Data, is processed at the Company's operating offices and in any other places where 
              the parties involved in the processing are located. It means that this information may be transferred to — and maintained 
              on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection 
              laws may differ than those from Your jurisdiction.
            </p>

            <h3>Delete Your Personal Data</h3>
            <p>
              You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You. 
              You may delete or request deletion of Your Personal Data by contacting Us at{" "}
              <a href="mailto:writorycontest@gmail.com" className="text-green-600">writorycontest@gmail.com</a>.
            </p>

            <h3>Security of Your Personal Data</h3>
            <p>
              The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, 
              or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your 
              Personal Data, We cannot guarantee its absolute security.
            </p>

            <h2>Children's Privacy</h2>
            <p>
              Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information 
              from anyone under the age of 13. If You are a parent or guardian and You are aware that Your child has provided Us with 
              Personal Data, please contact Us.
            </p>

            <h2>Changes to this Privacy Policy</h2>
            <p>
              We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy 
              on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>

            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, You can contact us:</p>
            <ul>
              <li>By email: <a href="mailto:writorycontest@gmail.com" className="text-green-600">writorycontest@gmail.com</a></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
