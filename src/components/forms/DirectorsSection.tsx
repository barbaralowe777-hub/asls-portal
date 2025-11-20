import React from "react";
import { Upload } from "lucide-react";

export type DirectorInfo = {
  title?: string;
  firstName?: string;
  lastName?: string;
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
  licenceFrontUrl?: string;
  licenceBackUrl?: string;
  medicareFrontUrl?: string;
};

interface DirectorsSectionProps {
  directors: DirectorInfo[];
  setDirectors: React.Dispatch<React.SetStateAction<DirectorInfo[]>>;
  directorsAreGuarantors: boolean;
  setDirectorsAreGuarantors: (value: boolean) => void;
  registerAddressRef?: (index: number, el: HTMLInputElement | null) => void;
}

const blankDirector = (): DirectorInfo => ({
  title: "",
  firstName: "",
  lastName: "",
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

const DirectorsSection: React.FC<DirectorsSectionProps> = ({
  directors,
  setDirectors,
  directorsAreGuarantors,
  setDirectorsAreGuarantors,
  registerAddressRef,
}) => {
  const ensureCount = (count: number) => {
    setDirectors((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(blankDirector());
      return next.slice(0, count);
    });
  };

  const updateDirector = (
    index: number,
    field: keyof DirectorInfo,
    value: string
  ) => {
    setDirectors((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const updateDirectorFile = (
    index: number,
    field: "licenceFrontFile" | "licenceBackFile" | "medicareFrontFile",
    file: File | null
  ) => {
    setDirectors((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: file } : d))
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Directors</h2>
        <p className="text-sm text-gray-600">
          Provide details for up to two company directors.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="font-medium text-gray-700">Number of Directors</label>
          <select
            value={directors.length >= 2 ? "2" : "1"}
            onChange={(e) => ensureCount(e.target.value === "2" ? 2 : 1)}
            className="w-32 border rounded-lg p-2"
          >
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>
      </div>

      {directors.map((director, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 bg-gray-50 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              Director {index + 1}
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <select
                value={director.title || ""}
                onChange={(e) => updateDirector(index, "title", e.target.value)}
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
                value={director.firstName || ""}
                onChange={(e) =>
                  updateDirector(index, "firstName", e.target.value)
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
                value={director.lastName || ""}
                onChange={(e) =>
                  updateDirector(index, "lastName", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={director.phone || ""}
                onChange={(e) => updateDirector(index, "phone", e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={director.email || ""}
                onChange={(e) => updateDirector(index, "email", e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                value={director.dob || ""}
                onChange={(e) => updateDirector(index, "dob", e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={director.address || ""}
              onChange={(e) => updateDirector(index, "address", e.target.value)}
              ref={(el) => registerAddressRef?.(index, el)}
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
                value={director.licenceNumber || ""}
                onChange={(e) =>
                  updateDirector(index, "licenceNumber", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Licence State
              </label>
              <select
                value={director.licenceState || ""}
                onChange={(e) =>
                  updateDirector(index, "licenceState", e.target.value)
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
                value={director.licenceExpiry || ""}
                onChange={(e) =>
                  updateDirector(index, "licenceExpiry", e.target.value)
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
                value={director.medicareNumber || ""}
                onChange={(e) =>
                  updateDirector(index, "medicareNumber", e.target.value)
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
                value={director.medicareExpiry || ""}
                onChange={(e) =>
                  updateDirector(index, "medicareExpiry", e.target.value)
                }
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <UploadTile
              id={`director-${index}-licence-front`}
              label="Licence Front Upload"
              accept="image/*,application/pdf"
              file={director.licenceFrontFile || null}
              onChange={(file) =>
                updateDirectorFile(index, "licenceFrontFile", file)
              }
            />
            <UploadTile
              id={`director-${index}-licence-back`}
              label="Licence Back Upload"
              accept="image/*,application/pdf"
              file={director.licenceBackFile || null}
              onChange={(file) =>
                updateDirectorFile(index, "licenceBackFile", file)
              }
            />
            <UploadTile
              id={`director-${index}-medicare`}
              label="Medicare Card Upload"
              accept="image/*,application/pdf"
              file={director.medicareFrontFile || null}
              onChange={(file) =>
                updateDirectorFile(index, "medicareFrontFile", file)
              }
            />
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <label className="font-medium text-gray-700">
          Are the Directors also the Guarantors?
        </label>
        <select
          value={directorsAreGuarantors ? "yes" : "no"}
          onChange={(e) => setDirectorsAreGuarantors(e.target.value === "yes")}
          className="w-40 border rounded-lg p-2"
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    </div>
  );
};

export const createBlankDirector = blankDirector;

export default DirectorsSection;
