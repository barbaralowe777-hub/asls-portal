import React, { useEffect } from "react";
import { Upload } from "lucide-react";
/* global google */

export type GuarantorInfo = {
  title?: string;
  firstName?: string;
  lastName?: string;
  relationshipToDirector?: string;
  phone?: string;
  email?: string;
  dob?: string;
  address?: string;
  licenceNumber?: string;
  licenceState?: string;
  licenceExpiry?: string;
  medicareNumber?: string;
  medicareExpiry?: string;
  licenceFrontFile?: File | null;
  licenceBackFile?: File | null;
  medicareFrontFile?: File | null;
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
  licenceNumber: "",
  licenceState: "",
  licenceExpiry: "",
  medicareNumber: "",
  medicareExpiry: "",
  licenceFrontFile: null,
  licenceBackFile: null,
  medicareFrontFile: null,
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
    const sanitizeLicence = (val: string) =>
      (val || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
    setGuarantors((prev) =>
      prev.map((g, i) =>
        i === index
          ? { ...g, [field]: field === "licenceNumber" ? sanitizeLicence(value) : value }
          : g
      )
    );
  };

  const updateGuarantorFile = (
    index: number,
    field: "licenceFrontFile" | "licenceBackFile" | "medicareFrontFile",
    file: File | null
  ) => {
    setGuarantors((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: file } : g))
    );
  };

  const UploadTile = ({
    id,
    accept,
    label,
    file,
    onChange,
  }: {
    id: string;
    accept?: string;
    label: string;
    file: File | null | undefined;
    onChange: (file: File | null) => void;
  }) => (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
        <input
          type="file"
          id={id}
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        <label htmlFor={id} className="cursor-pointer block">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {file?.name ? file.name : "Upload file"}
          </p>
        </label>
      </div>
    </div>
  );

  useEffect(() => {
    const bindAutocomplete = () => {
      guarantors.forEach((_, index) => {
        const id = `guarantor-address-${index}`;
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input && !(input as any)._acBound) {
          const ac = new google.maps.places.Autocomplete(input, {
            types: ["address"],
            componentRestrictions: { country: "au" },
          });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (place?.formatted_address) {
              updateGuarantor(index, "address", place.formatted_address);
            }
          });
          (input as any)._acBound = true;
        }
      });
    };
    if ((window as any).google?.maps?.places) {
      bindAutocomplete();
      return;
    }
    const timer = window.setInterval(() => {
      if ((window as any).google?.maps?.places) {
        window.clearInterval(timer);
        bindAutocomplete();
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [guarantors.length]);

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
                <option value="Spouse">Spouse</option>
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
          id={`guarantor-address-${index}`}
              value={guarantor.address || ""}
              onChange={(e) =>
                updateGuarantor(index, "address", e.target.value)
              }
              className="w-full border rounded-lg p-2"
          placeholder="Street, suburb, state, postcode"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Driver Licence Number
          </label>
          <input
            type="text"
            value={guarantor.licenceNumber || ""}
            onChange={(e) =>
              updateGuarantor(index, "licenceNumber", e.target.value)
            }
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Licence State</label>
          <select
            value={guarantor.licenceState || ""}
            onChange={(e) =>
              updateGuarantor(index, "licenceState", e.target.value)
            }
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select</option>
            <option value="NSW">NSW</option>
            <option value="VIC">VIC</option>
            <option value="QLD">QLD</option>
            <option value="SA">SA</option>
            <option value="WA">WA</option>
            <option value="TAS">TAS</option>
            <option value="NT">NT</option>
            <option value="ACT">ACT</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            Licence Expiry
          </label>
          <input
            type="date"
            value={guarantor.licenceExpiry || ""}
            onChange={(e) =>
              updateGuarantor(index, "licenceExpiry", e.target.value)
            }
            className="w-full border rounded-lg p-2"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Medicare Number
          </label>
          <input
            type="text"
            value={guarantor.medicareNumber || ""}
            onChange={(e) =>
              updateGuarantor(index, "medicareNumber", e.target.value)
            }
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            Medicare Expiry
          </label>
          <input
            type="month"
            value={guarantor.medicareExpiry || ""}
            onChange={(e) =>
              updateGuarantor(index, "medicareExpiry", e.target.value)
            }
            className="w-full border rounded-lg p-2"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <UploadTile
          id={`guarantor-${index}-licence-front`}
          label="Licence Front Upload"
          accept="image/*,application/pdf"
          file={guarantor.licenceFrontFile || null}
          onChange={(file) =>
            updateGuarantorFile(index, "licenceFrontFile", file)
          }
        />
        <UploadTile
          id={`guarantor-${index}-licence-back`}
          label="Licence Back Upload"
          accept="image/*,application/pdf"
          file={guarantor.licenceBackFile || null}
          onChange={(file) =>
            updateGuarantorFile(index, "licenceBackFile", file)
          }
        />
        <UploadTile
          id={`guarantor-${index}-medicare`}
          label="Medicare Card Upload"
          accept="image/*,application/pdf"
          file={guarantor.medicareFrontFile || null}
          onChange={(file) =>
            updateGuarantorFile(index, "medicareFrontFile", file)
          }
        />
      </div>
        </div>
      ))}
    </div>
  );
};

export const createBlankGuarantor = blankGuarantor;

export default GuarantorsSection;
