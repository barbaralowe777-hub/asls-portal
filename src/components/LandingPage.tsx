import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Handshake,
  Headset,
  Leaf,
  LineChart,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const portalUrl = "https://portal.asls.net.au";
  const heroVideo = "/hero.mp4"; // file placed in /public/hero.mp4
  const heroPoster = "/ASLS-logo.png";
  const [videoAvailable, setVideoAvailable] = useState(true);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.includes("access_token") && window.location.pathname === "/") {
      navigate(`/reset-password${hash}`, { replace: true });
    }
  }, [navigate]);

  const features = [
    {
      icon: ShieldCheck,
      title: "Live finance status & tasks",
      description:
        "Track approvals, tasks, and outstanding requirements for your business and your agents in one portal.",
    },
    {
      icon: LineChart,
      title: "Energy & finance calculators",
      description:
        "Easy-to-use savings and finance calculators that help you position cash-flow positive projects with clients.",
    },
    {
      icon: Headset,
      title: "Same-day conditional approvals",
      description:
        "Online applications built for vendors and agents with same-day conditional approvals to keep installs moving.",
    },
  ];

  const steps = [
    {
      title: "Onboard your team",
      description:
        "Register your business, upload accreditation, and get portal access for vendors, installers, and sales reps.",
    },
    {
      title: "Online application",
      description:
        "Easy online application process with finance and energy savings calculators built in.",
    },
    {
      title: "Track approvals to settlement",
      description:
        "Same-day responses, credit sign-off milestones, and lender-ready contracts so you can schedule installs faster.",
    },
  ];

  const proofPoints = [
    "Approved with clean energy savings and cash-flow positive positioning",
    "Structures for SMEs, councils, schools, agribusiness, and industrial sites",
    "Seasoned brokers with national solar funder relationships",
    "Portal workflows with status tracking and outstanding tasks for vendors and agents",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Edge-to-edge top banner */}
      <div className="bg-[#39FF14] border-b border-[#39FF14]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-5">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="rounded-3xl bg-white p-7 shadow-md border border-emerald-100 flex items-center justify-center">
                <img
                  src="https://d64gsuwffb70l.cloudfront.net/68e338ca2cce289ba3b6eac4_1760324623689_be6a0877.png"
                  alt="Australian Solar Lending Solutions"
                  className="h-32 w-32 object-contain"
                />
              </div>
              <div>
                <p className="text-base uppercase tracking-[0.26em] text-emerald-800 font-bold">
                  Australian Solar Lending Solutions
                </p>
                <p className="text-xl text-gray-900 font-semibold">
                  Commercial Solar Finance | Vendor & Installer Specialists
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-sm border border-emerald-100 text-emerald-900 font-semibold min-h-[44px]">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span>Clean Energy Council Aligned</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-sm border border-emerald-100 text-emerald-900 font-semibold min-h-[44px]">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <span>Commercial Solar Lender</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-sm border border-emerald-100 text-emerald-900 font-semibold min-h-[44px]">
                <LineChart className="h-5 w-5 text-emerald-700" />
                <span>Deals $20k-$1m</span>
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-12 space-y-12">

        
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-lg bg-slate-900 min-h-[420px]">
          <div className="absolute inset-0">
            {videoAvailable ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                poster={heroPoster}
                onError={() => setVideoAvailable(false)}
              >
                <source src={heroVideo} type="video/mp4" />
              </video>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-700 to-emerald-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-transparent" />
          </div>
          <div className="relative z-20 max-w-3xl px-6 py-12 lg:px-10 lg:py-16 space-y-5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 bg-white/10 px-3 py-2 rounded-full backdrop-blur">
              Built for Australian solar vendors
              <Zap className="h-4 w-4 text-amber-300" />
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Commercial solar finance that moves installs forward.
            </h1>
            <p className="text-lg text-slate-100 leading-relaxed">
              We help commercial solar vendors, EPCs, and installers win more projects with finance structures that make energy savings obvious. ASLS combines solar expertise, credit know-how, and a streamlined portal so you can submit deals, monitor approvals, and schedule installs faster.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 px-8 py-4 text-white text-base font-semibold shadow-md hover:bg-emerald-700 transition"
              >
                Enter Vendor Portal
                <ArrowRight className="h-6 w-6" />
              </a>
              <button
                onClick={() => navigate("/vendor-intake")}
                className="inline-flex items-center justify-center gap-3 rounded-full border border-emerald-200 bg-white/90 px-8 py-4 text-emerald-900 text-base font-semibold shadow-sm hover:-translate-y-[1px] hover:shadow-md transition"
              >
                Register as a vendor
                <Handshake className="h-6 w-6 text-emerald-700" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-4 shadow-sm backdrop-blur">
                <Clock3 className="h-5 w-5 text-emerald-100" />
                <div>
                  <p className="text-sm font-semibold text-white">Same-day responses</p>
                  <p className="text-xs text-slate-100/80">Indicative approvals</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-4 shadow-sm backdrop-blur">
                <Building2 className="h-5 w-5 text-amber-200" />
                <div>
                  <p className="text-sm font-semibold text-white">SME to mid-market</p>
                  <p className="text-xs text-slate-100/80">Up to multi-site</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-4 shadow-sm backdrop-blur">
                <Leaf className="h-5 w-5 text-emerald-100" />
                <div>
                  <p className="text-sm font-semibold text-white">Cash-flow positive</p>
                  <p className="text-xs text-slate-100/80">Energy savings-led</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Snapshot */}
{/* Snapshot */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-800 font-semibold">
              Portal stats
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Active deals</p>
                <p className="text-2xl font-bold text-gray-900">48</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Tasks due</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-600">Same-day</p>
                <p className="text-2xl font-bold text-gray-900">92%</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-800 font-semibold">
              Energy & finance calculators
            </p>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              Show energy savings, repayments, and cash-flow positive positions to clients in minutes.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-800 font-semibold">
              Approvals & statuses
            </p>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Harbour Logistics</span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 text-xs px-3 py-1 border border-emerald-100">
                  Conditional
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>GreenTech Civil</span>
                <span className="rounded-full bg-amber-50 text-amber-800 text-xs px-3 py-1 border border-amber-100">
                  Docs needed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sunrise Schools</span>
                <span className="rounded-full bg-blue-50 text-blue-800 text-xs px-3 py-1 border border-blue-100">
                  In review
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-emerald-100" />
            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-[0.2em]">
              Vendor-first finance
            </p>
            <div className="h-[1px] flex-1 bg-emerald-100" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Finance that helps you win and install more commercial solar.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:-translate-y-1 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800 mb-4">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 uppercase tracking-[0.2em]">
            <CheckCircle2 className="h-4 w-4" />
            Vendor workflow
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            A clean, lender-ready path from quote to install.
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-emerald-100/70 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <p className="font-semibold text-gray-900">{step.title}</p>
                </div>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Proof & portal value */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-stretch">
          <div className="rounded-3xl bg-slate-900 text-white p-7 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-amber-300 font-semibold">
                Why ASLS
              </div>
              <h4 className="mt-3 text-2xl font-bold">
                Finance partner for commercial solar vendors and installers across Australia.
              </h4>
              <p className="mt-3 text-sm text-gray-200 leading-relaxed">
                ASLS blends clean energy experience with deep credit knowledge so vendors can close more
                commercial solar projects.
              </p>
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-gray-100"
                >
                  <CheckCircle2 className="h-4 w-4 text-amber-300 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-[0.15em]">
              Built into the portal
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-800 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 mt-0.5" />
                Easy energy savings and finance calculators for client conversations.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 mt-0.5" />
                Online applications with same-day conditional approvals.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 mt-0.5" />
                Live finance status and outstanding tasks for your business and agents.
              </li>
            </ul>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-emerald-800 uppercase tracking-[0.15em]">
                Ready to move installs forward?
              </p>
              <h5 className="mt-2 text-2xl font-bold text-gray-900">
                Get accredited, submit your first deal, and keep approvals flowing.
              </h5>
              <p className="mt-2 text-sm text-gray-700 max-w-2xl">
                Enter the vendor portal to track commercial solar finance from quote to install, or register now so we can set up your team with the right permissions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-white font-semibold shadow-md hover:bg-emerald-700 transition"
              >
                Go to portal
                <ArrowRight className="h-5 w-5" />
              </a>
              <button
                onClick={() => navigate("/vendor-intake")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-3 text-emerald-900 font-semibold shadow-sm hover:-translate-y-[1px] hover:shadow-md transition"
              >
                Register now
                <Handshake className="h-5 w-5 text-emerald-700" />
              </button>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-500">
          Copyright {new Date().getFullYear()} Australian Solar Lending Solutions. Commercial solar finance for vendors and installers across Australia.
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
