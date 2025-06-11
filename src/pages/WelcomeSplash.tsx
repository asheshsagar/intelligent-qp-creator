import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NetworkGridBackground from '@/components/NetworkGridBackground';

const WelcomeSplash = () => {
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState('');
  const fullText = 'Exam-Scribe AI';
  const [showSubtext, setShowSubtext] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Typing animation for the main title
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setTypedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // Show subtext after typing is complete
        setTimeout(() => {
          setShowSubtext(true);
        }, 300);
      }
    }, 150); // Adjust typing speed

    // Set a timeout to navigate to login after 7 seconds
    const timer = setTimeout(() => {
      // Start fade out
      setFadeOut(true);
      
      // Wait for fade out animation to complete, then navigate
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    }, 7000);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <NetworkGridBackground>
      <div 
        className={`flex flex-col items-center justify-center min-h-screen transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="text-center space-y-8 px-4">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold text-white">
              Welcome to <span className="text-cyan-400 inline-block min-w-[7ch]">{typedText}</span>
              <span className="animate-pulse text-cyan-400">|</span>
            </h1>
          </div>
          
          <div 
            className={`transition-all duration-1000 transform ${showSubtext ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
          >
            <p className="text-xl md:text-2xl text-cyan-100">
              Your intelligent exam creation assistant
            </p>
          </div>
          
          <div 
            className={`mt-12 transition-all duration-1000 delay-500 ${showSubtext ? 'opacity-50 translate-y-0' : 'opacity-0 translate-y-5'}`}
          >
            <div className="flex justify-center items-center space-x-2">
              <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
              <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        </div>
      </div>
    </NetworkGridBackground>
  );
};

export default WelcomeSplash;