
import React, { useState, useRef } from 'react';
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

  const handleSpin = () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setSelectedChallenge(null);
    setShowCelebration(false);

    // Realistic spin physics
    const minSpins = 5;
    const maxSpins = 10;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const finalAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + finalAngle;

    // Random duration between 3-5 seconds for realistic feel
    const duration = 3000 + Math.random() * 2000;

    setRotation(totalRotation);

    // Apply CSS transition with ease-out for deceleration effect
    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
    }

    // Calculate which segment we landed on - accounting for the arrow pointing at the top
    // The arrow points at the top (0 degrees), so we need to adjust the calculation
    const normalizedAngle = (totalRotation % 360);
    // Since the arrow points at the top, we need to find which slice the top position lands on
    // Add half segment angle to center the selection on the slice
    const adjustedAngle = (normalizedAngle + (segmentAngle / 2)) % 360;
    const selectedIndex = Math.floor(adjustedAngle / segmentAngle) % challenges.length;

    setTimeout(() => {
      const selected = challenges[selectedIndex];
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

  const handleSpinAgain = () => {
    setSelectedChallenge(null);
    setShowCelebration(false);
    handleSpin();
  };

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

        .celebration-sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: gold;
          border-radius: 50%;
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .wheel-slice {
          position: absolute;
          width: 50%;
          height: 50%;
          transform-origin: 100% 100%;
          overflow: hidden;
        }

        .slice-content {
          position: absolute;
          width: 200%;
          height: 200%;
          border-radius: 50%;
          transform: rotate(-45deg);
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
              
              {/* Perfect Center Arrow with 3D effect */}
              <div 
                ref={arrowRef}
                className="absolute z-30"
                style={{ 
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div 
                  className="relative"
                  style={{
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
                  }}
                >
                  {/* Arrow with gradient and glow - rotated 180 degrees to point down */}
                  <div 
                    className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent"
                    style={{
                      borderTopColor: '#ef4444',
                      filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))',
                    }}
                  />
                  {/* Arrow highlight */}
                  <div 
                    className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-white opacity-40"
                  />
                </div>
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
                  
                  // Split long titles into multiple lines
                  const words = challenge.challengeTitle.split(' ');
                  let line1 = '';
                  let line2 = '';
                  
                  if (words.length === 1) {
                    line1 = words[0].length > 12 ? words[0].substring(0, 10) + '..' : words[0];
                  } else if (words.length === 2) {
                    line1 = words[0].length > 8 ? words[0].substring(0, 6) + '..' : words[0];
                    line2 = words[1].length > 8 ? words[1].substring(0, 6) + '..' : words[1];
                  } else {
                    // More than 2 words - try to balance the lines
                    const midPoint = Math.ceil(words.length / 2);
                    const firstHalf = words.slice(0, midPoint).join(' ');
                    const secondHalf = words.slice(midPoint).join(' ');
                    
                    line1 = firstHalf.length > 12 ? firstHalf.substring(0, 10) + '..' : firstHalf;
                    line2 = secondHalf.length > 12 ? secondHalf.substring(0, 10) + '..' : secondHalf;
                  }
                  
                  return (
                    <div
                      key={index}
                      className="wheel-slice"
                      style={{
                        transform: `rotate(${angle}deg)`,
                        clipPath: `polygon(0 0, ${Math.cos((segmentAngle * Math.PI) / 180) * 100}% ${Math.sin((segmentAngle * Math.PI) / 180) * 100}%, 0 100%)`,
                        backgroundColor: color,
                        borderRight: '2px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      <div 
                        style={{
                          position: 'absolute',
                          top: '25%',
                          left: '65%',
                          transform: `rotate(${segmentAngle / 2}deg) translateX(-50%)`,
                          transformOrigin: 'center',
                          width: '120px',
                          textAlign: 'center',
                        }}
                      >
                        <div 
                          className="font-bold"
                          style={{
                            color: 'white',
                            textShadow: '3px 3px 6px rgba(0,0,0,0.9), -2px -2px 4px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
                            fontSize: '10px',
                            display: 'block',
                            lineHeight: '1.2',
                            fontWeight: '900',
                            letterSpacing: '0.3px',
                          }}
                        >
                          <div style={{ marginBottom: '2px' }}>{line1}</div>
                          {line2 && <div>{line2}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Premium Center Hub */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full z-20"
                  style={{
                    background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
                    boxShadow: `
                      0 0 0 4px rgba(255,255,255,0.9),
                      0 0 20px rgba(0,0,0,0.3),
                      inset 0 4px 8px rgba(255,255,255,0.2),
                      inset 0 -4px 8px rgba(0,0,0,0.2)
                    `,
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div 
                        className="w-6 h-6 rounded-full"
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
              <div className="absolute inset-0 w-80 h-80 rounded-full border-4 border-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 opacity-20 pointer-events-none animate-pulse" />
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
          <Card className={`w-full max-w-lg border-4 shadow-2xl animate-pulse ${showCelebration ? 'animate-bounce' : ''}`}
            style={{
              borderColor: colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length],
              background: `linear-gradient(135deg, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}15 0%, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}25 100%)`,
              animation: showCelebration ? 'glow 1s ease-in-out infinite alternate' : undefined,
            }}
          >
            <CardHeader className="text-center text-white"
              style={{
                background: `linear-gradient(135deg, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]} 0%, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}dd 100%)`,
              }}
            >
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <span className="text-3xl animate-bounce">🎉</span>
                Challenge Selected!
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="text-center p-6 bg-white rounded-xl shadow-inner border-2"
                style={{
                  borderColor: `${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}50`,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                  boxShadow: `inset 0 4px 8px ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}20, 0 4px 16px ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}30`,
                }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]} 0%, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}cc 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {selectedChallenge.challengeTitle}
                </h3>
                <p className="text-gray-700 text-base leading-relaxed font-medium">
                  {selectedChallenge.description}
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={handleUseChallenge}
                  className="text-white px-10 py-4 font-bold text-lg shadow-xl transform transition-all duration-200 hover:scale-105 rounded-xl border-2 border-white/20"
                  style={{
                    background: `linear-gradient(135deg, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]} 0%, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}dd 100%)`,
                    boxShadow: `0 8px 24px ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}60, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.background = `linear-gradient(135deg, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}dd 0%, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}bb 100%)`;
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.background = `linear-gradient(135deg, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]} 0%, ${colorPalette[challenges.findIndex(c => c.challengeTitle === selectedChallenge.challengeTitle) % colorPalette.length]}dd 100%)`;
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
