
import * as React from 'react';
import { useState, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { RefreshCw, Play, Sparkles } from 'lucide-react';

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
  const [showCelebration, setShowCelebration] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  // Vibrant color palette for distinct slices
  const colorPalette = [
    "#FF6B6B", // Red
    "#FFD93D", // Yellow
    "#6BCB77", // Green
    "#4D96FF", // Blue
    "#B983FF", // Purple
    "#FFB5E8", // Pink
    "#00C2CB", // Teal
    "#FF9F1C", // Orange
    "#A8E6CF", // Light Green
    "#FFB3BA", // Light Pink
    "#BFEFFF", // Light Blue
    "#FFFACD"  // Light Yellow
  ];

  const segmentAngle = 360 / challenges.length;

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  };

  const animateArrow = () => {
    if (arrowRef.current) {
      arrowRef.current.style.animation = 'none';
      arrowRef.current.offsetHeight; // Trigger reflow
      arrowRef.current.style.animation = 'arrowBounce 0.6s ease-out';
    }
  };

  // Fixed spin logic for accurate segment selection
  const handleSpin = () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setSelectedChallenge(null);
    setShowCelebration(false);

    // Pick a random index
    const targetIndex = Math.floor(Math.random() * challenges.length);
    const minSpins = 5;
    const maxSpins = 8;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    
    // Calculate angle to land on target segment at 12 o'clock (top pointer)
    // Since segments start at 0 degrees (3 o'clock) and go clockwise
    const targetAngle = targetIndex * segmentAngle + (segmentAngle / 2); // Center of segment
    const finalAngle = 360 - targetAngle; // Reverse to account for wheel rotation
    const totalRotation = spins * 360 + finalAngle;

    const duration = 3000 + Math.random() * 2000;

    setRotation(totalRotation);

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
    }

    setTimeout(() => {
      const selected = challenges[targetIndex];
      setSelectedChallenge(selected);
      setIsSpinning(false);
      animateArrow();
      triggerCelebration();
    }, duration);
  };

  const handleUseChallenge = () => {
    if (selectedChallenge) {
      onChallengeSelected(selectedChallenge);
    }
  };

  

  // Calculate which segment is currently at the top (under the pointer)
  const getCurrentSegmentIndex = () => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const pointerAngle = (360 - normalizedRotation) % 360;
    let segmentIndex = Math.floor(pointerAngle / segmentAngle);
    if (segmentIndex >= challenges.length) segmentIndex = 0;
    return segmentIndex;
  };

  const currentSelectedIndex = getCurrentSegmentIndex();

  return (
    <>
      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes arrowBounce {
          0% { transform: translateX(-50%) translateY(0px) scale(1); }
          30% { transform: translateX(-50%) translateY(-8px) scale(1.1); }
          60% { transform: translateX(-50%) translateY(-4px) scale(1.05); }
          100% { transform: translateX(-50%) translateY(0px) scale(1); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6); }
        }

        @keyframes segmentPulse {
          0% { box-shadow: 0 0 0 0 #fbbf24, 0 0 18px #fbbf24cc; }
          50% { box-shadow: 0 0 0 8px #fbbf24, 0 0 32px #fbbf24cc; }
          100% { box-shadow: 0 0 0 0 #fbbf24, 0 0 18px #fbbf24cc; }
        }

        @keyframes pointerBounce {
          0% { transform: translateX(-50%) scale(1); }
          30% { transform: translateX(-50%) scale(1.15); }
          60% { transform: translateX(-50%) scale(0.95); }
          100% { transform: translateX(-50%) scale(1); }
        }

        .celebration-sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: gold;
          border-radius: 50%;
          animation: sparkle 1.5s ease-in-out infinite;
        }

        
      `}</style>

      <div className="flex flex-col items-center space-y-6 p-6 relative">
        {/* Celebration Effect */}
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none z-30">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="celebration-sparkle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                }}
              />
            ))}
          </div>
        )}

        <Card className="w-full max-w-md shadow-2xl border-0 bg-gradient-to-br from-white via-purple-50 to-pink-50 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 text-white">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              Poetry Challenge Spinner
              <Sparkles className="w-6 h-6" />
            </CardTitle>
            <p className="text-purple-100 font-medium">
              Poem {poemIndex} Challenge Selection
            </p>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center space-y-8 p-8 bg-gradient-to-br from-white to-purple-50 relative">
            {/* Premium Wheel Container with 3D effect */}
            <div 
              className="relative w-80 h-80 flex items-center justify-center"
              style={{ 
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))',
                marginTop: '40px' 
              }}
            >
              
              {/* Perfect Center Arrow with 3D effect - Pointing DOWN to wheel */}
              <div 
                ref={arrowRef}
                className="absolute z-30"
                style={{ 
                  position: 'absolute',
                  top: '-28px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
                  animation: !isSpinning && selectedChallenge ? 'pointerBounce 0.7s' : undefined
                }}
              >
                <div 
                  style={{
                    width: '0',
                    height: '0',
                    borderLeft: '20px solid transparent',
                    borderRight: '20px solid transparent',
                    borderTop: '40px solid #fbbf24',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                />
              </div>

              {/* Premium Wheel with individual slice colors */}
              <div 
                ref={wheelRef}
                className={`w-80 h-80 rounded-full relative overflow-hidden ${
                  !isSpinning ? 'transition-none' : ''
                }`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  border: '8px solid #fbbf24',
                  boxShadow: `
                    0 0 0 4px rgba(251, 191, 36, 0.3),
                    0 20px 40px rgba(0,0,0,0.2),
                    inset 0 0 60px rgba(255,255,255,0.1),
                    inset 0 0 0 2px rgba(255,255,255,0.2)
                  `,
                }}
              >
                {/* Individual slices with unique colors */}
                {challenges.map((challenge, index) => {
                  const angle = index * segmentAngle;
                  const color = colorPalette[index % colorPalette.length];
                  const isSelected = index === currentSelectedIndex && !isSpinning;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'absolute',
                        width: '50%',
                        height: '50%',
                        transformOrigin: '100% 100%',
                        transform: `rotate(${angle}deg)`,
                        overflow: 'hidden',
                        borderRight: '2px solid rgba(255,255,255,0.3)',
                        boxShadow: isSelected ? '0 0 0 4px #fbbf24, 0 0 20px #fbbf24aa' : 'none',
                        animation: isSelected ? 'segmentPulse 1.5s ease-in-out infinite' : undefined,
                        zIndex: isSelected ? 10 : 1
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          width: '200%',
                          height: '200%',
                          borderRadius: '50%',
                          transform: 'rotate(-45deg)',
                          background: `linear-gradient(135deg, ${color} 70%, rgba(255,255,255,0.2) 100%)`,
                        }}
                      />
                      {/* Text positioned properly in each slice */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '20%',
                          left: '60%',
                          width: '80%',
                          height: '60%',
                          transform: `rotate(${segmentAngle / 2}deg)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          transformOrigin: '0% 50%',
                          pointerEvents: 'none',
                          zIndex: 2
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: challenges.length > 8 ? '0.6rem' : challenges.length > 6 ? '0.7rem' : '0.8rem',
                            color: '#fff',
                            textShadow: '0 2px 6px rgba(0,0,0,0.9)',
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            userSelect: 'none',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            lineHeight: 1.2,
                            maxWidth: challenges.length > 8 ? '70px' : '80px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                          }}
                        >
                          {challenge.challengeTitle?.length > 10 
                            ? challenge.challengeTitle.substring(0, 10) + '...'
                            : challenge.challengeTitle || challenge.contestType || 'Challenge'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Premium Center Hub */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full z-20"
                  style={{
                    background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
                    boxShadow: `
                      0 0 0 3px rgba(255,255,255,0.9),
                      0 0 20px rgba(0,0,0,0.3),
                      inset 0 3px 6px rgba(255,255,255,0.2),
                      inset 0 -3px 6px rgba(0,0,0,0.2)
                    `,
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Outer decorative rings for premium feel */}
              <div className="absolute inset-0 w-80 h-80 rounded-full border-2 border-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 opacity-20 pointer-events-none animate-pulse" />
              {/* Glossy overlay */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                style={{
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 60% 30%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
                  boxShadow: '0 0 32px 8px rgba(255,255,255,0.12) inset',
                }}
              />
            </div>

            {/* Premium Spin Button */}
            {!selectedChallenge && (
              <Button 
                onClick={handleSpin} 
                disabled={isSpinning || disabled}
                className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 text-white px-16 py-6 rounded-2xl font-bold text-xl shadow-2xl transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-white/20"
                style={{
                  boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {isSpinning ? (
                  <>
                    <RefreshCw className="animate-spin mr-3" size={28} />
                    <span className="animate-pulse">Spinning Magic...</span>
                  </>
                ) : (
                  <>
                    <Play className="mr-3" size={28} />
                    Spin the Wheel!
                  </>
                )}
              </Button>
            )}

            {/* Spinning status with premium styling */}
            {isSpinning && !selectedChallenge && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-3 text-purple-600 font-bold text-lg mb-4">
                  <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce" />
                  <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <p className="text-lg text-gray-700 font-semibold bg-white/70 backdrop-blur-sm px-6 py-2 rounded-full border border-purple-200">
                  🎯 Selecting your perfect challenge...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Challenge Display with celebration effect */}
        {selectedChallenge && (
          <Card className={`w-full max-w-lg border-4 border-green-500 shadow-2xl ${showCelebration ? 'animate-bounce' : ''}`}
            style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              animation: showCelebration ? 'glow 1s ease-in-out infinite alternate' : undefined,
            }}
          >
            <CardHeader className="text-center bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <span className="text-3xl animate-bounce">🎉</span>
                Challenge Selected!
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="text-center p-6 bg-white rounded-xl shadow-inner border-2 border-green-200"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  boxShadow: 'inset 0 4px 8px rgba(34, 197, 94, 0.1), 0 4px 16px rgba(34, 197, 94, 0.2)',
                }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {selectedChallenge.challengeTitle}
                </h3>
                <p className="text-gray-700 text-base leading-relaxed font-medium">
                  {selectedChallenge.description}
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={handleUseChallenge}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-10 py-4 font-bold text-lg shadow-xl transform transition-all duration-200 hover:scale-105 rounded-xl border-2 border-white/20"
                  style={{
                    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Sparkles className="mr-2" size={20} />
                  Use This Challenge
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
