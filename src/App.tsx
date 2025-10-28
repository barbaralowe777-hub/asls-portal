import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "@/components/LandingPage";
import VendorIntakeForm from "@/components/VendorIntakeForm";

function App() {
  console.log("✅ App mounted");

  return (
    <Router>
      <Routes>
        {/* Home */}
        <Route path="/" element={<LandingPage />} />

        {/* Vendor form */}
        <Route path="/vendor-intake" element={<VendorIntakeForm />} />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <div
              style={{
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                color: "red",
              }}
            >
              404 – Page Not Found
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;