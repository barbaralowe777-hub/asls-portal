import React from "react";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  PiggyBank,
  Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Clock,
      title: "Same Day Approvals",
      description: "Quick finance approvals to help your customers move faster.",
    },
    {
      icon: PiggyBank,
      title: "$0 Deposit Options",
      description: "Finance smarter with no upfront costs for your clients.",
    },
    {
      icon: Award,
      title: "20 Yrs Finance Experience",
      description: "Trust the brokers who understand solar and finance.",
    },
  ];

  // ✅ CORS-safe PNG partner logos
  const partners = [
    {
      name: "Jinko Solar",
      logo: "https://companieslogo.com/img/orig/JKS_BIG-adfd8d8b.png?t=1725698450",
    },
    {
      name: "Sungrow",
      logo: "https://companieslogo.com/img/orig/300274.SZ_BIG-f5d5ed7b.png?t=1725698469",
    },
    {
      name: "Trina Solar",
      logo: "https://companieslogo.com/img/orig/688599.SS_BIG-ccda50a5.png?t=1725698523",
    },
    {
      name: "Fronius",
      logo: "https://www.fronius.com/~/media/fronius/img/logos/fronius-logo.png",
    },
    {
      name: "GoodWe",
      logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/GoodWe_logo.png",
    },
  ];

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
      <div className="relative z-10 overflow-hidden">
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
                <button
                  onClick={() => navigate("/vendor-dashboard")}
                  className="bg-white text-[#1dad21] px-6 py-4 rounded-lg font-semibold border-2 border-[#1dad21] hover:bg-green-50 transition shadow-sm hover:shadow-md"
                >
                  Vendor Login
                </button>
                <button
                  onClick={() => navigate("/agent-dashboard")}
                  className="bg-white text-[#1dad21] px-6 py-4 rounded-lg font-semibold border-2 border-[#1dad21] hover:bg-green-50 transition shadow-sm hover:shadow-md"
                >
                  Agents Login
                </button>
                <button
                  onClick={() => navigate("/admin-dashboard")}
                  className="bg-[#D4AF37] text-white px-6 py-4 rounded-lg font-semibold hover:bg-yellow-600 transition shadow-sm hover:shadow-md"
                >
                  Admin Login
                </button>
              </div>

              {/* Get Accredited Button */}
              <div className="mt-4">
                <button
                  onClick={() => navigate("/vendor-intake")}
                  className="w-full sm:w-auto bg-[#1dad21] text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center shadow-md hover:shadow-lg"
                >
                  Get Accredited <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </div>

              {/* Highlights */}
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-[#1dad21] mr-2" />
                  <span className="text-sm text-gray-700">Fast approvals</span>
                </div>
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
                alt="Business professionals"
                className="rounded-2xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6 mx-auto">
                <feature.icon className="w-8 h-8 text-[#1dad21]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-700">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
