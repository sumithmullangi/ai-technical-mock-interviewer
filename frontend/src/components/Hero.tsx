import React from 'react';
import { LandingPage } from './LandingPage';

interface HeroProps {
  onOpenSetup: () => void;
  onScrollToFeatures?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenSetup, onScrollToFeatures }) => {
  return (
    <LandingPage
      onStartPracticing={onOpenSetup}
      onHowItWorks={onScrollToFeatures}
    />
  );
};
