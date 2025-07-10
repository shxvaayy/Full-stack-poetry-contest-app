
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, Users, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { getCurrentContestType, getContestTypeForMonth } from '@/data/contestChallenges';
import { useLocation } from 'wouter';

export default function EventPage() {
  const [, setLocation] = useLocation();
  const currentContestType = getCurrentContestType();
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const contestTypeDescriptions = {
    "Theme-Based": "Explore rich themes and create poetry around specific topics and emotions.",
    "Constraint-Based": "Challenge your creativity with unique rules and constraints.",
    "Form-Based": "Master traditional and modern poetry forms with structured challenges.",
    "Prompt-Based": "Respond to creative prompts and unusual scenarios with original verse."
  };

  const rewards = [
    { 
      tier: "Free Tier", 
      poems: 1, 
      price: "₹0", 
      features: [
        "✔️ Submit 1 Poem",
        "🛠️ Basic Community Support",
        "🏆 E-Certificate (If Selected as Winner)"
      ] 
    },
    { 
      tier: "Single Tier", 
      poems: 1, 
      price: "₹50", 
      features: [
        "✔️ Submit 1 Poem",
        "⚡ Priority Reading by Judges",
        "📝 Expert Feedback on Poem",
        "🏅 Winner E-Certificate"
      ] 
    },
    { 
      tier: "Double Tier", 
      poems: 2, 
      price: "₹90", 
      features: [
        "✔️ Submit 2 Poems",
        "⚡ Faster Judging Queue",
        "📝 Feedback for Both Poems",
        "🏅 Winner E-Certificate",
        "💰 Save 10% Compared to Single Tier"
      ] 
    },
    { 
      tier: "Bulk Tier", 
      poems: 5, 
      price: "₹230", 
      features: [
        "✔️ Submit Up to 5 Poems",
        "🚀 Fastest Judging Priority",
        "📝 In-Depth Feedback on All Poems",
        "🏅 Winner E-Certificate",
        "💸 Maximum Value for Creators"
      ] 
    }
  ];

  const howItWorks = [
    { step: 1, title: "Choose Your Tier", description: "Select how many poems you want to submit" },
    { step: 2, title: "Spin for Challenges", description: "Use our wheel to get unique challenges for each poem" },
    { step: 3, title: "Write Your Poetry", description: "Create amazing verses based on your challenges" },
    { step: 4, title: "Submit & Win", description: "Upload your poems and compete for monthly prizes" }
  ];

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-purple-600" size={32} />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Monthly Poetry Event
            </h1>
            <Sparkles className="text-pink-600" size={32} />
          </div>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Join thousands of poets in our monthly themed challenges. Spin the wheel, get inspired, and compete for exciting prizes!
          </p>
        </div>

        {/* Current Contest */}
        <Card className="mb-12 border-2 border-purple-300 bg-gradient-to-r from-purple-100 to-pink-100">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="text-purple-600" size={24} />
              <CardTitle className="text-2xl font-bold text-purple-800">
                {currentMonth} Contest
              </CardTitle>
            </div>
            <Badge variant="secondary" className="bg-purple-200 text-purple-800 text-lg px-4 py-2">
              {currentContestType} Challenge
            </Badge>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              {contestTypeDescriptions[currentContestType]}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>Contest ends on last day of month</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>All skill levels welcome</span>
              </div>
            </div>
            <Button 
              onClick={() => setLocation('/submit')}
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold"
            >
              Start Your Submission
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">How It Works</CardTitle>
            <p className="text-gray-600">Simple steps to participate in our poetry challenges</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {howItWorks.map((item) => (
                <div key={item.step} className="text-center space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submission Tiers */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Trophy className="text-yellow-500" size={28} />
              Submission Tiers & Rewards
            </CardTitle>
            <p className="text-gray-600">Choose the tier that fits your poetry goals</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {rewards.map((tier, index) => (
                <Card key={index} className={`relative shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${index === 3 ? 'border-2 border-purple-500 shadow-lg' : 'border-gray-200'}`}>
                  {index === 3 && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-500 text-white px-3 py-1">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-lg font-bold text-gray-800">{tier.tier}</CardTitle>
                    <div className="text-3xl font-bold text-purple-600 mb-1">{tier.price}</div>
                    <p className="text-sm text-gray-500 font-medium">{tier.poems} poem{tier.poems > 1 ? 's' : ''}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="text-sm text-gray-700 flex items-start gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5"></div>
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        

      </div>
    </div>
  );
}
