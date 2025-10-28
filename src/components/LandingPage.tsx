import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 bg-cover bg-center relative">
      {/* Logo */}
      <div className="absolute top-4 left-4 z-10">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/68e338ca2cce289ba3b6eac4_1760324623689_be6a0877.png"
          alt="Australian Solar Lending Solutions"
          className="h-20 w-auto mb-6 drop-shadow-lg"
        />
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          {/* Left Column */}
          <div>
            <h1 className="font-extrabold text-gray-900 mb-6 text-5xl leading-tight tracking-tight">
              Streamline Your Lending Process
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-10">
              Commercial Solar Finance made easy with our vendor portal. Submit
              applications, track progress, and grow your revenue with seamless
              lending integration.
            </p>

            {/* Login Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Link
                to="/vendor-dashboard"
                className="bg-white text-[#1dad21] px-6 py-4 rounded-lg font-semibold border-2 border-[#1dad21] hover:bg-green-50 transition shadow-sm hover:shadow-md text-center"
              >
                Vendor Login
              </Link>
              <Link
                to="/agent-dashboard"
                className="bg-white text-[#1dad21] px-6 py-4 rounded-lg font-semibold border-2 border-[#1dad21] hover:bg-green-50 transition shadow-sm hover:shadow-md text-center"
              >
                Agents Login
              </Link>
              <Link
                to="/admin-dashboard"
                className="bg-[#D4AF37] text-white px-6 py-4 rounded-lg font-semibold hover:bg-yellow-600 transition shadow-sm hover:shadow-md text-center"
              >
                Admin Login
              </Link>
            </div>

            {/* Get Accredited */}
            <div className="mt-4">
              <Link
                to="/vendor-intake"
                className="w-full sm:w-auto bg-[#1dad21] text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center shadow-md hover:shadow-lg"
              >
                Get Accredited <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>

            {/* Highlights */}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-[#1dad21] mr-2" />
                <span className="text-sm text-gray-700">No setup fees</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-[#1dad21] mr-2" />
                <span className="text-sm text-gray-700">24/7 support</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/68e338ca2cce289ba3b6eac4_1760413004157_e31364bb.png"
              alt="Solar installation team"
              className="rounded-2xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
