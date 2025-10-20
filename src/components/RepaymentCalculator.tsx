import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, Calendar, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RepaymentCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [loanTerm, setLoanTerm] = useState<string>("60");
  const [industry, setIndustry] = useState<string>("General");
  const [monthlyRepayment, setMonthlyRepayment] = useState<number | null>(null);
  const [weeklyRepayment, setWeeklyRepayment] = useState<number | null>(null);

  const DOC_FEE = 385;
  const UPLIFT_INDUSTRIES = ["Beauty", "Gym", "Hospitality"];

  // Tiered base rates (GST inclusive)
  const getBaseRate = (amount: number): number => {
    if (amount <= 20000) return 11.9;
    if (amount <= 35000) return 10.9;
    if (amount <= 50000) return 9.9;
    return 9.5;
  };

  const calculateRepayment = () => {
    const amount = parseFloat(loanAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid loan amount");
      return;
    }

    let rate = getBaseRate(amount);
    if (UPLIFT_INDUSTRIES.includes(industry)) rate += 1; // +1% uplift

    const months = parseInt(loanTerm);
    const monthlyRate = rate / 100 / 12;

    // Standard amortised repayment formula
    const monthly =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    const weekly = (monthly * 12) / 52;

    setMonthlyRepayment(monthly);
    setWeeklyRepayment(weekly);
  };

  const resetCalculator = () => {
    setLoanAmount("");
    setLoanTerm("60");
    setIndustry("General");
    setMonthlyRepayment(null);
    setWeeklyRepayment(null);
  };

  const currency = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Input Section */}
        <Card className="bg-white shadow-md border border-gray-100">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="h-6 w-6 text-blue-600" />
              Equipment Finance Calculator
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Enter your details below to estimate repayments.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* Loan Amount */}
            <div>
              <Label className="text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Loan Amount
              </Label>
              <Input
                type="number"
                placeholder="Enter loan amount"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="text-lg py-6"
              />
            </div>

            {/* Loan Term */}
            <div>
              <Label className="text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Loan Term
              </Label>
              <Select value={loanTerm} onValueChange={setLoanTerm}>
                <SelectTrigger className="text-lg py-6">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {[12, 24, 36, 48, 60, 72, 84].map((term) => (
                    <SelectItem key={term} value={term.toString()}>
                      {term} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div>
              <Label className="text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Industry
              </Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="text-lg py-6">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Beauty">Beauty</SelectItem>
                  <SelectItem value="Gym">Gym</SelectItem>
                  <SelectItem value="Hospitality">Hospitality</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={calculateRepayment}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
              >
                Calculate
              </Button>
              <Button
                variant="outline"
                onClick={resetCalculator}
                className="text-lg py-6"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Results Section */}
        <Card className="bg-white shadow-md border border-gray-100">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              Repayment Results
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Estimated repayments (incl. GST)
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            {monthlyRepayment ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <h2 className="text-5xl font-bold text-blue-700">
                  {currency(monthlyRepayment)}
                </h2>
                <p className="text-gray-600 text-lg">
                  per month for {loanTerm} months
                </p>
                <p className="text-gray-600 text-lg">
                  Weekly: <span className="font-medium">{currency(weeklyRepayment || 0)}</span>
                </p>
                <Alert className="mt-6">
                  <AlertDescription className="text-base text-gray-700">
                    * A one-time documentation fee of{" "}
                    <span className="font-semibold">$385 (incl. GST)</span>{" "}
                    is payable on settlement with your first repayment.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                <Calculator className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter details and click “Calculate” to view results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-100">
          <CardContent className="p-5">
            <h3 className="text-blue-600 font-semibold mb-1 text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Flexible Terms
            </h3>
            <p className="text-gray-600 text-base">
              Choose from 12 to 84 months to best suit your business cash flow.
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-5">
            <h3 className="text-blue-600 font-semibold mb-1 text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fast Processing
            </h3>
            <p className="text-gray-600 text-base">
              Quick approval and settlement for your equipment finance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepaymentCalculator;
