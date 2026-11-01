import React from 'react';
import { CreditCard, QrCode, Calendar, BarChart3, ShieldCheck, Activity } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: <QrCode size={32} className="text-primary" />,
      title: "QR check-in",
      description: "Members show a signed QR code that changes every minute and works once. Staff scan it at the desk, and the system checks the plan and the account."
    },
    {
      icon: <BarChart3 size={32} className="text-blue-500" />,
      title: "Admin dashboard",
      description: "Active members, today's check-ins, a 7-day chart, member plans and payment totals for front-desk staff."
    },
    {
      icon: <Calendar size={32} className="text-purple-500" />,
      title: "Trainer booking",
      description: "Members book a session with an available trainer and can cancel it. Trainers switch their availability on or off."
    },
    {
      icon: <CreditCard size={32} className="text-orange-500" />,
      title: "Payments and receipts",
      description: "Staff record cash or bank-transfer payments (monthly ₦25,000, day pass ₦500). Members see their history and printable receipts. There are no real online payments."
    },
    {
      icon: <ShieldCheck size={32} className="text-pink-500" />,
      title: "Accounts and access",
      description: "Email verification, password reset, three roles, and staff can deactivate an account without deleting its records."
    },
    {
      icon: <Activity size={32} className="text-green-600" />,
      title: "Workout log",
      description: "Members log workouts with their exercises and see this week's schedule."
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-2">Features</h2>
          <h3 className="text-3xl md:text-4xl font-display font-bold text-background-dark mb-4">
            What it does <span className="text-primary">today</span>
          </h3>
          <p className="max-w-2xl mx-auto text-xl text-gray-500">
            Six parts of one demo system for members, trainers and front-desk staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow duration-300 border border-transparent hover:border-gray-100">
              <div className="w-14 h-14 bg-white rounded-lg shadow-sm flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
