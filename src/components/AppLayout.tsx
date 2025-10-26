import React from "react";
import VendorIntakeForm from "@/components/VendorIntakeForm";

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <VendorIntakeForm
        onBack={() => alert("Back clicked")}
        onSubmit={() => alert("Form submitted successfully!")}
      />
    </div>
  );
};

export default AppLayout;