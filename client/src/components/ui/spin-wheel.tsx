import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { RefreshCw, Play, Sparkles, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // <-- add this
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [spinVelocity, setSpinVelocity] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ultra-vibrant color palette for premium feel - now with both gradient and primary color
  const colorPalette = [
    { gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)", primary: "#ff6b6b" }, // Vibrant Red
    { gradient: "linear-gradient(135deg, #ffd93d 0%, #f39c12 100%)", primary: "#ffd93d" }, // Golden Yellow  
    { gradient: "linear-gradient(135deg, #6bcb77 0%, #27ae60 100%)", primary: "#6bcb77" }, // Emerald Green
    { gradient: "linear-gradient(135deg, #4d96ff 0%, #2980b9 100%)", primary: "#4d96ff" }, // Royal Blue
    { gradient: "linear-gradient(135deg, #b983ff 0%, #9b59b6 100%)", primary: "#b983ff" }, // Purple Magic
    { gradient: "linear-gradient(135deg, #ff85a2 0%, #e91e63 100%)", primary: "#ff85a2" }, // Rose Pink
    { gradient: "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)", primary: "#00d2ff" }, // Ocean Blue
    { gradient: "linear-gradient(135deg, #ff9f43 0%, #f39c12 100%)", primary: "#ff9f43" }, // Sunset Orange
    { gradient: "linear-gradient(135deg, #26de81 0%, #20bf6b 100%)", primary: "#26de81" }, // Fresh Green
    { gradient: "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)", primary: "#a29bfe" }, // Lavender
    { gradient: "linear-gradient(135deg, #fd79a8 0%, #e84393 100%)", primary: "#fd79a8" }, // Magenta
    { gradient: "linear-gradient(135deg, #00cec9 0%, #00b894 100%)", primary: "#00cec9" }  // Turquoise
  ];

  const segmentAngle = 360 / challenges.length;

  // Create spinning sound effect
  useEffect(() => {
    // Create a simple tick sound using Web Audio API
    const createTickSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };

    if (isSpinning && spinVelocity > 0.5) {
      const interval = setInterval(() => {
        try {
          createTickSound();
        } catch (e) {
          // Audio context might not be available
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isSpinning, spinVelocity]);

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const animateArrow = () => {
    if (arrowRef.current) {
      arrowRef.current.style.animation = 'none';
      arrowRef.current.offsetHeight; // Trigger reflow
      arrowRef.current.style.animation = 'arrowBounce 0.8s ease-out';
    }
  };

  const handleSpin = () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setSelectedChallenge(null);
    setSelectedColor(null); // <-- reset color
    setSelectedSegmentIndex(null);
    setShowCelebration(false);

    // Ultra-realistic physics calculation
    const minSpins = 8;
    const maxSpins = 15;
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const finalAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + finalAngle;

    // Variable duration based on spins for realistic deceleration
    const baseDuration = 4000;
    const variableDuration = spins * 200;
    const duration = baseDuration + variableDuration;

    setRotation(totalRotation);
    setSpinVelocity(spins);

    // Apply advanced CSS transition with custom cubic-bezier for authentic feel
    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.02, 0.05, 0.95)`;
    }

    // Calculate which segment we landed on
    // The wheel rotates clockwise. The pointer is at the top (0 degrees).
    // We need to find the segment that the pointer is over.
    // The segments are drawn starting from 0 degrees (top) and going clockwise.
    // A segment at index `i` covers angles from `i * segmentAngle` to `(i + 1) * segmentAngle`.
    // The pointer is fixed at the top, so we need to see which segment rotates under it.
    // The wheel's rotation is `totalRotation`.
    // A point on the wheel that was originally at `0` degrees (top of segment 0) will be at `totalRotation` degrees.
    // The pointer is at 0 degrees (top).
    // We need to find the segment whose center aligns with the pointer after rotation.
    
    // First, normalize the total rotation to be within 0-360 degrees.
    const currentRotation = totalRotation % 360;

    // The pointer is at the top (0 degrees). The segments are drawn clockwise.
    // If the wheel rotates by `currentRotation` degrees, a point that was at `X` degrees
    // is now at `X + currentRotation` degrees. We are interested in the point that ends up at 0 degrees (the pointer).
    // So, we need to find `X` such that `X + currentRotation = 0 (mod 360)`.
    // This means `X = -currentRotation (mod 360)`.
    // Or, `X = (360 - currentRotation) % 360`.
    // This `X` is the angle on the *original* wheel that is now under the pointer.
    const angleUnderPointer = (360 - currentRotation) % 360;

    // Now, determine which segment this `angleUnderPointer` falls into.
    // Segments are 0-indexed, starting from the top (0 degrees) and going clockwise.
    // Segment 0: 0 to segmentAngle
    // Segment 1: segmentAngle to 2*segmentAngle
    // ...
    // Segment N: N*segmentAngle to (N+1)*segmentAngle
    let selectedIndex = Math.floor(angleUnderPointer / segmentAngle);

    // Ensure selectedIndex is within bounds (0 to challenges.length - 1)
    selectedIndex = selectedIndex % challenges.length;
    if (selectedIndex < 0) selectedIndex += challenges.length;

    // Gradual velocity decrease simulation
    const velocityDecrease = setInterval(() => {
      setSpinVelocity(prev => Math.max(0, prev - 0.1));
    }, 100);

    setTimeout(() => {
      clearInterval(velocityDecrease);
      const selected = challenges[selectedIndex];
      setSelectedChallenge(selected);
      // Fix: Set the primary color instead of the gradient
      setSelectedColor(colorPalette[selectedIndex % colorPalette.length].primary);
      setSelectedSegmentIndex(selectedIndex);
      setIsSpinning(false);
      animateArrow();
      triggerCelebration();
      
      // Reset transition for next spin
      if (wheelRef.current) {
        wheelRef.current.style.transition = 'none';
      }
    }, duration);
  };

  const handleUseChallenge = () => {
    if (selectedChallenge) {
      onChallengeSelected(selectedChallenge);
    }
  };



  return (
    <>
      {/* Advanced CSS Keyframes and Styles */}
      <style jsx>{`
        @keyframes arrowBounce {
          0% { transform: translateX(-50%) translateY(0px) scale(1) rotate(0deg); }
          20% { transform: translateX(-50%) translateY(-12px) scale(1.15) rotate(-3deg); }
          40% { transform: translateX(-50%) translateY(-6px) scale(1.08) rotate(2deg); }
          60% { transform: translateX(-50%) translateY(-3px) scale(1.04) rotate(-1deg); }
          80% { transform: translateX(-50%) translateY(-1px) scale(1.02) rotate(0.5deg); }
          100% { transform: translateX(-50%) translateY(0px) scale(1) rotate(0deg); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          25% { opacity: 0.8; transform: scale(0.8) rotate(90deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
          75% { opacity: 0.8; transform: scale(0.8) rotate(270deg); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.3), 0 0 60px rgba(255, 215, 0, 0.1); }
          50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 215, 0, 0.4), 0 0 150px rgba(255, 215, 0, 0.2); }
        }

        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }

        @keyframes wheelGlow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(139, 69, 19, 0.3)); }
          50% { filter: drop-shadow(0 0 40px rgba(139, 69, 19, 0.6)) drop-shadow(0 0 60px rgba(255, 215, 0, 0.3)); }
        }

        .celebration-sparkle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: radial-gradient(circle, #ffd700 0%, #ff6347 100%);
          border-radius: 50%;
          animation: sparkle 2s ease-in-out infinite;
          box-shadow: 0 0 10px currentColor;
        }

        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 12px;
          animation: confetti 3s ease-out forwards;
        }

        .wheel-segment {
          transition: filter 0.3s ease;
        }

        .wheel-segment:hover {
          filter: brightness(1.1) saturate(1.2);
        }

        .premium-glow {
          animation: wheelGlow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col items-center space-y-8 p-8 relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        {/* Celebration Effects */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-50"
            >
              {/* Sparkles */}
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="celebration-sparkle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1.5 + Math.random()}s`,
                  }}
                />
              ))}
              
              {/* Confetti */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`confetti-${i}`}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '100%',
                    backgroundColor: colorPalette[i % colorPalette.length].primary,
                    animationDelay: `${Math.random() * 1}s`,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <Card className="w-full max-w-2xl shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-purple-50 overflow-hidden backdrop-blur-sm">
            <CardHeader className="text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse" />
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 relative z-10">
                <motion.div
                  animate={{ rotate: showCelebration ? 360 : 0 }}
                  transition={{ duration: 1 }}
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>
                Poetry Challenge Spinner
                <motion.div
                  animate={{ rotate: showCelebration ? -360 : 0 }}
                  transition={{ duration: 1 }}
                >
                  <Trophy className="w-8 h-8" />
                </motion.div>
              </CardTitle>
              <p className="text-blue-100 font-medium text-lg relative z-10">
                Poem {poemIndex} Challenge Selection
              </p>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center space-y-10 p-12 bg-gradient-to-br from-white to-blue-50 relative">
              {/* Ultra-Premium Wheel Container */}
              <div 
                className={`relative w-96 h-96 flex items-center justify-center ${isSpinning ? 'premium-glow' : ''}`}
                style={{ 
                  filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.15))',
                  marginTop: '50px' 
                }}
              >
                
                {/* Perfect Center Arrow with Enhanced 3D effect */}
                <motion.div 
                  ref={arrowRef}
                  className="absolute z-40"
                  style={{ 
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                  animate={{
                    scale: isSpinning ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: isSpinning ? Infinity : 0,
                  }}
                >
                  <div 
                    className="relative"
                    style={{
                      filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
                    }}
                  >
                    {/* Enhanced Arrow with metallic effect */}
                    <div 
                      className="w-0 h-0 border-l-[24px] border-r-[24px] border-t-[42px] border-l-transparent border-r-transparent relative"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                        filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))',
                      }}
                    />
                    {/* Arrow metallic highlight */}
                    <div 
                      className="absolute top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 100%)',
                        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                      }}
                    />
                  </div>
                </motion.div>

                {/* Premium Wheel with Enhanced Visuals */}
                <motion.div 
                  ref={wheelRef}
                  className={`w-96 h-96 rounded-full relative overflow-hidden ${
                    !isSpinning ? 'transition-none' : ''
                  }`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    background: 'conic-gradient(from 0deg, #8b4513, #d2691e, #8b4513)',
                    border: '8px solid #654321',
                    boxShadow: `
                      0 0 0 4px rgba(101, 67, 33, 0.8),
                      0 0 0 8px rgba(139, 69, 19, 0.6),
                      0 20px 40px rgba(0,0,0,0.3),
                      inset 0 0 0 2px rgba(255,255,255,0.1),
                      inset 0 0 20px rgba(0,0,0,0.2)
                    `,
                  }}
                  animate={{
                    boxShadow: isSpinning 
                      ? [
                          `0 0 0 4px rgba(101, 67, 33, 0.8), 0 20px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)`,
                          `0 0 0 4px rgba(255, 215, 0, 0.8), 0 20px 60px rgba(255,215,0,0.3), inset 0 0 20px rgba(255,215,0,0.1)`,
                          `0 0 0 4px rgba(101, 67, 33, 0.8), 0 20px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)`
                        ]
                      : `0 0 0 4px rgba(101, 67, 33, 0.8), 0 20px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)`
                  }}
                  transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
                >
                  {/* Individual Wheel Segments */}
                  {challenges.map((challenge, index) => {
                    const angle = index * segmentAngle;
                    const gradientColor = colorPalette[index % colorPalette.length].gradient;
                    const displayText = challenge.challengeTitle;
                    
                    return (
                      <div
                        key={index}
                        className="wheel-segment"
                        style={{
                          position: 'absolute',
                          width: '50%',
                          height: '50%',
                          transformOrigin: '100% 100%',
                          transform: `rotate(${angle}deg)`,
                          clipPath: `polygon(0 0, ${Math.cos((segmentAngle * Math.PI) / 180) * 100}% ${Math.sin((segmentAngle * Math.PI) / 180) * 100}%, 0 100%)`,
                          background: gradientColor,
                          borderRight: '2px solid rgba(255,255,255,0.3)',
                        }}
                      >
                        <div 
                          style={{
                            position: 'absolute',
                            top: '15%',
                            left: '40%',
                            transform: `rotate(${segmentAngle / 2}deg) translateX(20px)`,
                            transformOrigin: '0 0',
                            textAlign: 'left',
                            zIndex: 10,
                            width: '80px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                          }}
                        >
                          <span 
                            style={{
                              color: '#000000',
                              fontSize: displayText.length > 12 ? '8px' : displayText.length > 8 ? '9px' : '10px',
                              fontWeight: '900',
                              textShadow: `
                                1px 1px 0 rgba(255,255,255,1), 
                                -1px -1px 0 rgba(255,255,255,1), 
                                1px -1px 0 rgba(255,255,255,1), 
                                -1px 1px 0 rgba(255,255,255,1),
                                0 1px 0 rgba(255,255,255,1),
                                1px 0 0 rgba(255,255,255,1),
                                0 -1px 0 rgba(255,255,255,1),
                                -1px 0 0 rgba(255,255,255,1),
                                0 0 4px rgba(255,255,255,0.8)
                              `,
                              display: 'block',
                              lineHeight: '1.1',
                              letterSpacing: '0.5px',
                              textAlign: 'left',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '70px',
                              textTransform: 'uppercase',
                              fontFamily: 'Arial, sans-serif',
                              WebkitTextStroke: '0.5px rgba(255,255,255,0.8)',
                            }}
                          >
                            {displayText.length > 10 ? displayText.substring(0, 8) + '..' : displayText}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Enhanced Center Hub */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full z-30"
                    style={{
                      background: 'radial-gradient(circle, #2d3748 0%, #4a5568 30%, #2d3748 70%, #1a202c 100%)',
                      boxShadow: `
                        0 0 0 4px rgba(255,255,255,0.9),
                        0 0 0 8px rgba(139, 69, 19, 0.8),
                        0 0 20px rgba(0,0,0,0.4),
                        inset 0 4px 8px rgba(255,255,255,0.3),
                        inset 0 -4px 8px rgba(0,0,0,0.4)
                      `,
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <motion.div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: 'radial-gradient(circle, #f6ad55 0%, #ed8936 50%, #dd6b20 100%)',
                          boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.3)',
                        }}
                        animate={{
                          scale: isSpinning ? [1, 1.1, 1] : 1,
                        }}
                        transition={{
                          duration: 0.3,
                          repeat: isSpinning ? Infinity : 0,
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-inner" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Decorative outer rings */}
                <div className="absolute inset-0 w-96 h-96 rounded-full border-4 border-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 opacity-30 pointer-events-none animate-pulse" />
                <div className="absolute inset-2 w-92 h-92 rounded-full border-2 border-gradient-to-r from-blue-300 via-purple-300 to-pink-300 opacity-20 pointer-events-none" />
              </div>

              {/* Enhanced Control Buttons */}
              <div className="flex flex-col items-center space-y-6">
                {!selectedChallenge && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={handleSpin} 
                      disabled={isSpinning || disabled}
                      size="lg"
                      className={`
                        text-xl font-bold px-12 py-6 rounded-xl transition-all duration-300
                        ${isSpinning 
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 shadow-2xl hover:shadow-purple-500/25'
                        }
                        border-0 text-white relative overflow-hidden
                      `}
                      style={{
                        boxShadow: isSpinning 
                          ? 'none' 
                          : '0 10px 30px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        {isSpinning ? (
                          <>
                            <RefreshCw className="w-6 h-6 animate-spin" />
                            Spinning...
                          </>
                        ) : (
                          <>
                            <Play className="w-6 h-6" />
                            SPIN THE WHEEL
                          </>
                        )}
                      </span>
                      {!isSpinning && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* Challenge Result Display */}
                <AnimatePresence>
                  {selectedChallenge && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ duration: 0.6, type: "spring" }}
                      className="text-center space-y-6 max-w-lg"
                    >
                      <div 
                        className="p-8 rounded-2xl shadow-xl border-2"
                        style={{
                          background: selectedColor
                            ? `linear-gradient(135deg, ${selectedColor}20 0%, ${selectedColor}40 100%)`
                            : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', // fallback
                          borderColor: selectedColor || '#4d96ff',
                          boxShadow: selectedColor ? 
                            `0 25px 50px -12px ${selectedColor}40, 0 0 0 1px ${selectedColor}20` : 
                            '0 25px 50px -12px rgba(0,0,0,0.25)',
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <Trophy className="w-8 h-8 text-white" />
                        </motion.div>
                        
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                          🎯 Challenge Selected!
                        </h3>
                        <h4 className="text-xl font-semibold text-purple-600 mb-3">
                          {selectedChallenge.challengeTitle}
                        </h4>
                        <p className="text-gray-600 leading-relaxed mb-6">
                          {selectedChallenge.description}
                        </p>
                        
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
