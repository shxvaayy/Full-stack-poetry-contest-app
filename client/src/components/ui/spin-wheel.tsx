
import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { RefreshCw, Play } from 'lucide-react';

interface Challenge {
  contestType: string;
  challengeTitle: string;
  description: string;
}

interface SpinWheelProps {
  challenges: Challenge[];
  onChallengeSelected: (challenge: Challenge) => void;
  poemIndex?: number;
  disabled?: boolean;
}

export default function SpinWheel({ 
  challenges, 
  onChallengeSelected, 
  poemIndex = 1,
  disabled = false 
}: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#00D2D3', '#FF9F43', '#FC427B', '#26DE81'
  ];

  const segmentAngle = 360 / challenges.length;

  const handleSpin = () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    
    // Generate random rotation (multiple full rotations + random angle)
    const spins = 3 + Math.random() * 3; // 3-6 full rotations
    const finalAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + finalAngle;
    
    setRotation(totalRotation);

    // Calculate which segment we landed on
    const normalizedAngle = (360 - (totalRotation % 360)) % 360;
    const selectedIndex = Math.floor(normalizedAngle / segmentAngle) % challenges.length;
    
    setTimeout(() => {
      const selected = challenges[selectedIndex];
      setSelectedChallenge(selected);
      setIsSpinning(false);
    }, 3000);
  };

  const handleUseChallenge = () => {
    if (selectedChallenge) {
      onChallengeSelected(selectedChallenge);
    }
  };

  const handleSpinAgain = () => {
    setSelectedChallenge(null);
    handleSpin();
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-gray-800">
            Poetry Challenge Spinner
          </CardTitle>
          <p className="text-sm text-gray-600">
            Poem {poemIndex} Challenge Selection
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {/* Wheel Container */}
          <div className="relative w-64 h-64">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[30px] border-l-transparent border-r-transparent border-b-red-500"></div>
            </div>
            
            {/* Wheel */}
            <div 
              ref={wheelRef}
              className={`w-64 h-64 rounded-full border-4 border-gray-300 overflow-hidden transition-transform duration-[3s] ease-out ${
                isSpinning ? 'animate-pulse' : ''
              }`}
              style={{
                transform: `rotate(${rotation}deg)`,
                background: `conic-gradient(${challenges.map((_, index) => {
                  const startAngle = (index * segmentAngle);
                  const endAngle = ((index + 1) * segmentAngle);
                  return `${colors[index % colors.length]} ${startAngle}deg ${endAngle}deg`;
                }).join(', ')})`
              }}
            >
              {/* Challenge Labels */}
              {challenges.map((challenge, index) => {
                const angle = (index * segmentAngle) + (segmentAngle / 2);
                return (
                  <div
                    key={index}
                    className="absolute text-white text-xs font-bold text-center"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${angle}deg) translate(80px, -50%) rotate(-${angle}deg)`,
                      transformOrigin: '0 50%',
                      width: '60px',
                      lineHeight: '1.2'
                    }}
                  >
                    {challenge.challengeTitle.length > 15 
                      ? challenge.challengeTitle.substring(0, 12) + '...' 
                      : challenge.challengeTitle
                    }
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spin Button */}
          {!selectedChallenge && (
            <Button 
              onClick={handleSpin} 
              disabled={isSpinning || disabled}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-semibold"
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={20} />
                  Spinning...
                </>
              ) : (
                <>
                  <Play className="mr-2" size={20} />
                  Spin the Wheel!
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Selected Challenge Display */}
      {selectedChallenge && (
        <Card className="w-full max-w-lg border-2 border-green-500 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-green-800">
              🎉 Challenge Selected!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedChallenge.challengeTitle}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {selectedChallenge.description}
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleUseChallenge}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
              >
                Use This Challenge
              </Button>
              <Button 
                onClick={handleSpinAgain}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50 px-6 py-2"
              >
                Spin Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
