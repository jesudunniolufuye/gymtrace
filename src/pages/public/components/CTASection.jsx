import React from 'react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section id="cta" className="py-20 bg-background-dark text-white text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
          Try it yourself
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          This is a demo with example data. Create an account, log in, or follow the 10-minute guide to see the member,
          trainer and front-desk views.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="w-full sm:w-auto inline-block px-10 py-4 bg-primary text-white font-bold rounded-full text-lg shadow-lg hover:bg-opacity-90 transform hover:-translate-y-1 transition-all">
            Create an account
          </Link>
          <Link to="/login" className="w-full sm:w-auto inline-block px-10 py-4 border border-white/30 text-white font-bold rounded-full text-lg hover:bg-white/10 transition-colors">
            Log in
          </Link>
          <Link to="/guide" className="w-full sm:w-auto inline-block px-10 py-4 text-white font-bold rounded-full text-lg underline underline-offset-4 hover:text-primary transition-colors">
            Read the guide
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
