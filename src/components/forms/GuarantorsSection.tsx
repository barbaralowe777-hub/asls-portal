import React from "react";

export type GuarantorInfo = {
  title?: string;
  firstName?: string;
  lastName?: string;
  relationshipToDirector?: string;
  phone?: string;
  email?: string;
  dob?: string;
  address?: string;
};

interface GuarantorsSectionProps {
  guarantors: GuarantorInfo[];
  setGuarantors: React.Dispatch<React.SetStateAction<GuarantorInfo[]>>;
}

const blankGuarantor = (): GuarantorInfo => ({
  title: "",
  firstName: "",
  lastName: "",
  relationshipToDirector: "",
  phone: "",
  email: "",
  dob: "",
  address: "",
});

const GuarantorsSection: React.FC<GuarantorsSectionProps> = ({
  guarantors,
  setGuarantors,
}) => {
  const ensureCount = (count: number) => {
    setGuarantors((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(blankGuarantor());
      return next.slice(0, count);
    });
  };

  const updateGuarantor = (
    index: number,
    field: keyof GuarantorInfo,
    value: string
  ) => {
    setGuarantors((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Guarantors</h2>
        <p className="text-sm text-gray-600">
          Provide details for any guarantors that are not directors.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="font-medium text-gray-700">
            Number of Guarantors
          </label>
          <select
            value={guarantors.length >= 2 ? "2" : "1"}
            onChange={(e) => ensureCount(e.target.value === "2" ? 2 : 1)}
            className="w-32 border rounded-lg p-2"
          >
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>
      </div>

      {guarantors.map((guarantor, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 bg-gray-50 space-y-4"
        >
          <h3 className="font-semibold text-gray-800">
            Guarantor {index + 1}
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <select
                value={guarantor.title || ""}
                onChange={(e) =>
                  updateGuarantor(index, "title", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Miss">Miss</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                value={guarantor.firstName || ""}
                onChange={(e) =>
                  updateGuarantor(index, "firstName", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                value={guarantor.lastName || ""}
                onChange={(e) =>
                  updateGuarantor(index, "lastName", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Relationship to Director
              </label>
              <select
                value={guarantor.relationshipToDirector || ""}
                onChange={(e) =>
                  updateGuarantor(index, "relationshipToDirector", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Business Partner">Business Partner</option>
                <option value="Colleague">Work Colleague</option>
                <option value="Friend">Friend</option>
                <option value="Relative">Relative</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={guarantor.phone || ""}
                onChange={(e) =>
                  updateGuarantor(index, "phone", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={guarantor.email || ""}
                onChange={(e) =>
                  updateGuarantor(index, "email", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                value={guarantor.dob || ""}
                onChange={(e) => updateGuarantor(index, "dob", e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={guarantor.address || ""}
              onChange={(e) =>
                updateGuarantor(index, "address", e.target.value)
              }
              className="w-full border rounded-lg p-2"
              placeholder="Street, suburb, state, postcode"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const createBlankGuarantor = blankGuarantor;

export default GuarantorsSection;
