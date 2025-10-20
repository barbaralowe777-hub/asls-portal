import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, FileText, BarChart3, Key, LogOut, Calculator } from 'lucide-react';
interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isVendor?: boolean;
}
const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  isVendor = true
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = isVendor ? [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  }, {
    id: 'new-application',
    label: 'New Application',
    icon: FileText
  }, {
    id: 'repayment-calculator',
    label: 'Repayment Calculator',
    icon: Calculator
  }, {
    id: 'api-keys',
    label: 'API Keys',
    icon: Key
  }] : [{
    id: 'admin-analytics',
    label: 'Analytics',
    icon: BarChart3
  }, {
    id: 'dashboard',
    label: 'All Applications',
    icon: FileText
  }, {
    id: 'repayment-calculator',
    label: 'Repayment Calculator',
    icon: Calculator
  }];
  return <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button onClick={() => onNavigate('landing')} className="text-2xl font-bold text-[#1dad21]">ASLS Portal</button>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {navItems.map(item => <button key={item.id} onClick={() => onNavigate(item.id)} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${currentPage === item.id ? 'border-[#1dad21] text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>)}
            </div>
          </div>
          <div className="flex items-center">
            <button className="hidden md:flex items-center text-gray-700 hover:text-gray-900">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map(item => <button key={item.id} onClick={() => {
          onNavigate(item.id);
          setMobileMenuOpen(false);
        }} className={`block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium ${currentPage === item.id ? 'bg-green-50 border-[#1dad21] text-green-700' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}>
                <item.icon className="w-4 h-4 inline mr-2" />
                {item.label}
              </button>)}
          </div>
        </div>}
    </nav>;
};
export default Navigation;
