// CURSOR SYNC TEST: This comment was added by Cursor AI to verify deployment sync with Render.
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, MessageCircle, CheckCircle, User } from "lucide-react";
import logoImage from "@/assets/chatbot.png";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface FAQData {
  [key: string]: {
    question: string;
    answer: string;
  };
}

const faqData: FAQData = {
  "1": {
    question: "What is Writory?",
    answer: "Writory is a platform that hosts poetry and writing contests for aspiring writers. Participants can win cash prizes, recognition, shoutouts, and certificates."
  },
  "2": {
    question: "Who can participate?",
    answer: "Anyone with a passion for writing can participate! You must be 13 or older, and entries are welcome from any country. Right now, we accept submissions in English only, but we’re planning to expand to more languages soon!"
  },
  "3": {
    question: "What kinds of contests do you conduct?",
    answer: "We currently host poetry contests, and will soon introduce contests for short stories, micro tales, and more."
  },
  "4": {
    question: "Is there any participation fee?",
    answer: "First poem entry is absolutely FREE. For additional entries: ₹50 for 1 extra poem, ₹90 for 2,  ₹230 for 5."
  },
  "5": {
    question: "What is the maximum or minimum poem length allowed?",
    answer: "There are no limits! You can submit poems of any length."
  },
  "6": {
    question: "How can I submit my poem?",
    answer: "You can submit your work through our website submission form."
  },
  "7": {
    question: "How will I know if I've won?",
    answer: "Winners will be announced on our website and Instagram page. You'll also receive an official email from us."
  },
  "8": {
    question: "What are the prizes?",
    answer: "Cash prizes, digital certificates, Instagram shoutouts & recognition, and chance to be featured as a star writer."
  },
  "9": {
    question: "What languages are accepted?",
    answer: "Currently, we accept entries in English only."
  },
  "10": {
    question: "How are winners selected?",
    answer: "Winners are selected based on originality, creativity, emotional impact, and writing style, by our internal judging panel."
  },
  "11": {
    question: "Can I edit my poem after submission?",
    answer: "No edits are allowed once submitted, so please ensure your entry is final and well-edited."
  },
  "12": {
    question: "How often do contests happen?",
    answer: "We conduct monthly contests with occasional theme-based special editions."
  },
  "13": {
    question: "Where can I follow you?",
    answer: "Follow us on Instagram: @writoryofficial and visit our website for updates!"
  },
  "14": {
    question: "How can I contact Writory for support?",
    answer: "Email us or DM us on Instagram @writoryofficial."
  },
  "15": {
    question: "What is Writory Wall?",
    answer: "Writory Wall is a public space where all submitted writings get featured — poems, stories, and more! Anyone can explore, like, and follow the writers on Instagram. To get featured on the Writory Wall, just submit your piece through the *“Submit for Writory Wall”* option under the *Submit Poems* section."
  },
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showBadge, setShowBadge] = useState(true);
  const [showMoreQuestions, setShowMoreQuestions] = useState(false);
  const [currentState, setCurrentState] = useState<'questions' | 'typing' | 'followup'>('questions');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text: "Hey! This is Wribot. How can I help you? 😊",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);

    // Hide badge after 3 seconds
    const timer = setTimeout(() => {
      setShowBadge(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowBadge(false);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setCurrentState('questions');
    setShowMoreQuestions(false);
  };

  const handleQuestionClick = (questionId: string) => {
    const faq = faqData[questionId];
    if (!faq) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: faq.question,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentState('typing');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: faq.answer,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      setCurrentState('followup');
    }, 1500);
  };

  const handleAskAnother = () => {
    setCurrentState('questions');
    setShowMoreQuestions(false);
  };

  const handleCloseEnd = () => {
    closeChat();
  };

  const TypingIndicator = () => (
    <div className="flex items-start space-x-2 animate-fade-in">
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white p-3 rounded-xl rounded-tl-md shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );

  const initialQuestions = Object.entries(faqData).slice(0, 6);
  const additionalQuestions = Object.entries(faqData).slice(6);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      <Button
        onClick={toggleChat}
        className="relative w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 animate-glow hover:animate-bounce-subtle bg-black hover:bg-gray-900 p-0 overflow-hidden border-2 border-cyan-400"
      >
        {/* Logo Image */}
        <img 
          src={logoImage} 
          alt="Writory Logo" 
          className="w-10 h-10 object-contain rounded-full"
        />
        {/* Pulse Animation Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping"></div>
        {/* Notification Badge */}
        {showBadge && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">!</span>
          </div>
        )}
      </Button>

      {/* Chat Container */}
      {isOpen && (
        <Card className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 animate-slide-up max-h-[500px] flex flex-col">
          {/* Chat Header */}
          <div className="bg-primary text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src={logoImage} 
                  alt="Writory Logo" 
                  className="w-10 h-10 object-cover rounded-full"
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Wribot</h3>
                <p className="text-xs text-cyan-100">Online</p>
              </div>
            </div>
            <Button
              onClick={closeChat}
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-200 hover:bg-white/10 p-1 h-auto"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scrollbar" style={{ maxHeight: '300px' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 animate-fade-in ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl shadow-sm max-w-xs ${
                    message.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-md'
                      : 'bg-white text-gray-800 rounded-tl-md'
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                </div>
                {message.sender === 'user' && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-4 border-t bg-white rounded-b-2xl flex-shrink-0 max-h-48 overflow-y-auto">
            {currentState === 'questions' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">Choose a question:</p>

                {/* Scrollable Questions Container */}
                <div className="space-y-2 max-h-32 overflow-y-auto chat-scrollbar pr-2">
                  {/* Initial Questions */}
                  {initialQuestions.map(([id, faq]) => (
                    <Button
                      key={id}
                      onClick={() => handleQuestionClick(id)}
                      variant="outline"
                      className="w-full p-3 text-left rounded-lg bg-gray-50 hover:bg-cyan-50 hover:text-cyan-700 transition-colors duration-200 text-sm border-0 break-words whitespace-normal"
                    >
                      <span className="block text-left">{faq.question}</span>
                    </Button>
                  ))}

                  {/* Additional Questions */}
                  {showMoreQuestions && (
                    <>
                      {additionalQuestions.map(([id, faq]) => (
                        <Button
                          key={id}
                          onClick={() => handleQuestionClick(id)}
                          variant="outline"
                          className="w-full p-3 text-left rounded-lg bg-gray-50 hover:bg-cyan-50 hover:text-cyan-700 transition-colors duration-200 text-sm border-0 break-words whitespace-normal"
                        >
                          <span className="block text-left">{faq.question}</span>
                        </Button>
                      ))}
                    </>
                  )}
                </div>

                {/* Show More Button */}
                {!showMoreQuestions && (
                  <div className="text-center mt-2">
                    <Button
                      onClick={() => setShowMoreQuestions(true)}
                      variant="link"
                      className="text-primary text-xs p-0"
                    >
                      Show more questions...
                    </Button>
                  </div>
                )}
              </div>
            )}

            {currentState === 'followup' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 mb-3">Any other query?</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleAskAnother}
                    className="flex-1 bg-primary text-white hover:bg-primary/90"
                    size="sm"
                  >
                    Yes, ask another
                  </Button>
                  <Button
                    onClick={handleCloseEnd}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    No, thanks
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}