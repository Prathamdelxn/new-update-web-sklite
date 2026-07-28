'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Briefcase, Users, BarChart3, ArrowRight } from 'lucide-react';

const slides = [
  {
    title: 'Manage Projects with Ease',
    description: 'Track progress, manage teams, and stay on schedule with our intuitive project workspace.',
    icon: Briefcase,
    color: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Collaborate in Real-time',
    description: 'Connect with your site team, subcontractors, and clients instantly with live updates.',
    icon: Users,
    color: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Data-Driven Insights',
    description: 'Monitor budgets, material flow, and risks with powerful analytics and reporting tools.',
    icon: BarChart3,
    color: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
  };

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFF]">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
            SKY<span className="text-blue-600">LITE</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <div className="relative h-[340px] flex flex-col items-center text-center justify-center">
            <div className={`p-6 rounded-3xl ${slides[currentSlide].color} mb-8`}>
              <SlideIcon className={`w-16 h-16 ${slides[currentSlide].iconColor}`} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{slides[currentSlide].title}</h2>
            <p className="text-lg text-slate-500 max-w-md leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentSlide < slides.length - 1 ? (
              <button
                onClick={nextSlide}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl border border-gray-200 font-semibold transition-all active:scale-[0.98]"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl shadow-sm shadow-blue-600/20 font-bold transition-all active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
