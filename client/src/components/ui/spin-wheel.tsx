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

    // Generate random rotation with more realistic spinning
    const spins = 4 + Math.random() * 4; // 4-8 full rotations
    const finalAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + finalAngle;

    setRotation(totalRotation);

    // Calculate which segment we landed on - fixed for top pointer
    // The pointer is at the top (12 o'clock position), so we need to account for that
    const normalizedAngle = (360 - (totalRotation % 360)) % 360;
    const selectedIndex = Math.floor(normalizedAngle / segmentAngle) % challenges.length;

    // Realistic spinning experience with proper timing
    setTimeout(() => {
      const selected = challenges[selectedIndex];
      setSelectedChallenge(selected);
      setIsSpinning(false);
    }, 4500);
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
      <Card className="w-full max-w-md shadow-2xl border-2 border-purple-200">
        <CardHeader className="text-center bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Poetry Challenge Spinner
          </CardTitle>
          <p className="text-sm text-gray-600 font-medium">
            Poem {poemIndex} Challenge Selection
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-8 bg-gradient-to-br from-white to-purple-50">
          {/* Wheel Container */}
          <div className="relative w-80 h-80">
            {/* Pointer - Perfectly centered at 12 o'clock */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20">
              <div className="relative">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-red-600 drop-shadow-lg"></div>
                <div className="absolute top-[20px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-lg"></div>
              </div>
            </div>

            {/* Wheel */}
            <div 
              ref={wheelRef}
              className={`w-80 h-80 rounded-full border-8 border-gray-800 shadow-2xl overflow-hidden ${
                isSpinning 
                  ? 'transition-transform duration-[4500ms] ease-out' 
                  : 'transition-transform duration-300 ease-in-out'
              }`}
              style={{
                transform: `rotate(${rotation}deg)`,
                background: `conic-gradient(${challenges.map((_, index) => {
                  const startAngle = (index * segmentAngle);
                  const endAngle = ((index + 1) * segmentAngle);
                  return `${colors[index % colors.length]} ${startAngle}deg ${endAngle}deg`;
                }).join(', ')})`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 0 0 4px rgba(255,255,255,0.2)'
              }}
            >
              {/* Challenge Labels - Fixed positioning and styling */}
              {challenges.map((challenge, index) => {
                const angle = (index * segmentAngle) + (segmentAngle / 2);
                const radius = 100; // Distance from center

                return (
                  <div
                    key={index}
                    className="absolute"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${angle}deg) translate(0, -${radius}px) rotate(-${angle}deg)`,
                      transformOrigin: '0 0',
                      width: '90px',
                      marginLeft: '-45px',
                      marginTop: '-12px'
                    }}
                  >
                    <div 
                      className="text-white text-xs font-bold text-center leading-tight drop-shadow-lg px-1"
                      style={{
                        textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.7)',
                        fontSize: challenge.challengeTitle.length > 15 ? '10px' : '12px',
                        lineHeight: '1.2'
                      }}
                    >
                      {challenge.challengeTitle.length > 18 
                        ? challenge.challengeTitle.substring(0, 15) + '...' 
                        : challenge.challengeTitle
                      }
                    </div>
                  </div>
                );
              })}

              {/* Center circle for better appearance */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-inner"></div>
              </div>
            </div>

            {/* Outer decorative ring */}
            <div className="absolute inset-0 w-80 h-80 rounded-full border-4 border-gradient-to-r from-purple-400 to-pink-400 opacity-50"></div>
          </div>

          {/* Spin Button */}
          {!selectedChallenge && (
            <Button 
              onClick={handleSpin} 
              disabled={isSpinning || disabled}
              className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="animate-spin mr-3" size={24} />
                  Spinning...
                </>
              ) : (
                <>
                  <Play className="mr-3" size={24} />
                  Spin the Wheel!
                </>
              )}
            </Button>
          )}

          {/* Spinning status indicator - only show while actually spinning */}
          {isSpinning && !selectedChallenge && (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-purple-600 font-medium">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Get ready for your challenge!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Challenge Display */}
      {selectedChallenge && (
        <Card className="w-full max-w-lg border-4 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl animate-fadeIn">
          <CardHeader className="text-center bg-gradient-to-r from-green-100 to-emerald-100">
            <CardTitle className="text-2xl font-bold text-green-800 flex items-center justify-center">
              <span className="text-3xl mr-3">🎉</span>
              Challenge Selected!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-inner border border-green-200">
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                {selectedChallenge.challengeTitle}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {selectedChallenge.description}
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleUseChallenge}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                Use This Challenge
              </Button>
              <Button 
                onClick={handleSpinAgain}
                variant="outline"
                className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
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