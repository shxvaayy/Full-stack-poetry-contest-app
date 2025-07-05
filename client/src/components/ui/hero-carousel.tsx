import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

interface HeroCarouselProps {
  children?: React.ReactNode;
}

const carouselItems = [
  {
    title: "Express Your Soul",
    description: "Let your words flow like a river of emotion, touching hearts and inspiring minds.",
    gradient: "bg-gradient-to-br from-purple-600 to-blue-600"
  },
  {
    title: "Craft Your Legacy", 
    description: "Every poem is a piece of your soul, a legacy that will live on through generations.",
    gradient: "bg-gradient-to-br from-green-600 to-teal-600"
  },
  {
    title: "Find Your Voice",
    description: "In the silence of your thoughts, discover the power of your unique poetic voice.",
    gradient: "bg-gradient-to-br from-orange-600 to-red-600"
  },
  {
    title: "Share Your Story",
    description: "Your experiences are unique - transform them into verses that resonate with the world.",
    gradient: "bg-gradient-to-br from-indigo-600 to-purple-600"
  }
];

export function HeroCarousel({ children }: HeroCarouselProps) {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    // Preload images to prevent flickering
    const preloadImages = async () => {
      const imagePromises = carouselItems.map((item) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = ''; // No images used, just gradient backgrounds
        });
      });

      try {
        await Promise.all(imagePromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error preloading images:', error);
        setImagesLoaded(true); // Still show the carousel even if images fail
      }
    };

    preloadImages();
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={true}
        allowTouchMove={false}
        className="h-full w-full"
      >
        {carouselItems.map((item, index) => (
          <SwiperSlide key={index}>
            <div className={`relative h-full w-full ${item.gradient}`}>
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <h3 className="text-3xl font-bold mb-4">{item.title}</h3>
                  <p className="text-lg">{item.description}</p>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Overlay content */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        {children}
      </div>
    </div>
  );
}