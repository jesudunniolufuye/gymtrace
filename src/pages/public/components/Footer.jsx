import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="" className="h-8 w-auto grayscale brightness-200" />
              <span className="font-display font-bold text-xl text-white">GYMTRACE</span>
            </Link>
            <p className="text-sm leading-relaxed">
              A demo gym access and management system built for Babcock University Fitness Centre. It runs on example data.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase text-sm tracking-wider">Try it</h4>
            <ul className="space-y-2">
              <li><Link to="/guide" className="hover:text-white transition-colors">Reviewer guide</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Create an account</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Member and trainer log in</Link></li>
              <li><Link to="/admin/login" className="hover:text-white transition-colors">Staff log in</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase text-sm tracking-wider">About</h4>
            <ul className="space-y-2">
              <li><a href="/#features" className="hover:text-white transition-colors">What it does</a></li>
              <li><Link to="/help" className="hover:text-white transition-colors">Help and user manual</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy notice</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-sm">
          <p>&copy; {new Date().getFullYear()} GYMTRACE demo project. Example data only.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
