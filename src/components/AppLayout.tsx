import React from "react";
import { Outlet } from "react-router-dom";

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ✅ The Outlet is where child routes render */}
      <Outlet />
    </div>
  );
};

export default AppLayout;

