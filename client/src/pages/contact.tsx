
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Info, Clock, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import contactBg from "@/assets/contact.png";

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('📤 Sending contact data:', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        phoneLength: data.phone?.length,
        phoneType: typeof data.phone,
        message: data.message?.substring(0, 50) + '...'
      });
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent successfully!",
        description: "We will reply within 24 hours.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div
      style={{
        backgroundImage: `url(${contactBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600">Get in touch with the WRITORY team</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <Card className="transform hover:scale-105 transition-all duration-500 hover:shadow-2xl border-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-8 relative z-10">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6">Get In Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-blue-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <Mail className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 hover:text-blue-700 transition-colors duration-300">Email</h3>
                    <p className="text-gray-600 hover:text-gray-700 transition-colors duration-300">writorycontest@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-green-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <Phone className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 hover:text-green-700 transition-colors duration-300">Phone</h3>
                    <p className="text-gray-600 hover:text-gray-700 transition-colors duration-300">+91 96671 02405</p>
                    <p className="text-gray-600 hover:text-gray-700 transition-colors duration-300">+91 98186 91695</p>
                  </div>
                </div>

                <div className="flex items-start transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-purple-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <MapPin className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 hover:text-purple-700 transition-colors duration-300">Address</h3>
                    <p className="text-gray-600 hover:text-gray-700 transition-colors duration-300">Delhi, India</p>
                  </div>
                </div>

                <div className="flex items-start transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-orange-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 hover:text-orange-700 transition-colors duration-300">Response Time</h3>
                    <p className="text-gray-600 hover:text-gray-700 transition-colors duration-300">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card className="transform hover:scale-105 transition-all duration-500 hover:shadow-2xl border-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-8 relative z-10">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="transform hover:scale-105 transition-all duration-300">
                  <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 hover:text-purple-700 transition-colors duration-300">
                    Name *
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-purple-300 transition-all duration-300"
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="transform hover:scale-105 transition-all duration-300">
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 hover:text-purple-700 transition-colors duration-300">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-purple-300 transition-all duration-300"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div className="transform hover:scale-105 transition-all duration-300">
                  <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1 hover:text-purple-700 transition-colors duration-300">
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-purple-300 transition-all duration-300"
                    placeholder="Your phone number (optional)"
                  />
                </div>

                <div className="transform hover:scale-105 transition-all duration-300">
                  <Label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1 hover:text-purple-700 transition-colors duration-300">
                    Message *
                  </Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-purple-300 transition-all duration-300"
                    placeholder="Your message..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={contactMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {contactMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}