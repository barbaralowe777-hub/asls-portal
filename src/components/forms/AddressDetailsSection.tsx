import React from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { countries } from '@/data/countries';

interface AddressDetailsSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  addressLoading: boolean;
  addressSuggestions: any[];
  selectAddress: (suggestion: any) => void;
  handleAddressVerify: () => void;
}

const AddressDetailsSection: React.FC<AddressDetailsSectionProps> = ({ 
  formData, 
  handleChange, 
  addressLoading,
  addressSuggestions,
  selectAddress,
  handleAddressVerify
}) => {
  return (
    <div className="border-b pb-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">INSTALLATION ADDRESS DETAILS</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
            {addressLoading && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
          </label>
          <div className="relative">
            <input
              type="text"
              name="streetAddress"
              id="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              onBlur={handleAddressVerify}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            {addressSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                {addressSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectAddress(suggestion)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  >
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm">{suggestion.fullAddress}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Street Address Line 2</label>
          <input
            type="text"
            name="streetAddress2"
            value={formData.streetAddress2}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="NSW">New South Wales</option>
            <option value="VIC">Victoria</option>
            <option value="QLD">Queensland</option>
            <option value="WA">Western Australia</option>
            <option value="SA">South Australia</option>
            <option value="TAS">Tasmania</option>
            <option value="ACT">Australian Capital Territory</option>
            <option value="NT">Northern Territory</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postcode *</label>
          <input
            type="text"
            name="postcode"
            value={formData.postcode}
            onChange={handleChange}
            maxLength={4}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Premises Type *</label>
          <select
            name="premisesType"
            value={formData.premisesType}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="Rented">Rented</option>
            <option value="Owned">Owned</option>
          </select>
          {formData.premisesType === 'Owned' && (
            <p className="text-red-600 text-sm mt-2 font-medium">
              Please note support documentation of rates notice is required
            </p>
          )}
          {formData.premisesType === 'Rented' && (
            <p className="text-red-600 text-sm mt-2 font-medium">
              Please note support documentation of lease is required
            </p>
          )}
        </div>
        {formData.premisesType === 'Rented' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lease Expiry Date *</label>
            <input
              type="date"
              name="leaseExpiryDate"
              value={formData.leaseExpiryDate || ''}
              onChange={handleChange}
              required={formData.premisesType === 'Rented'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 mt-1">When does your commercial lease expire?</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="example@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressDetailsSection;
