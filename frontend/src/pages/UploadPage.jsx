import React from "react";
import ReceiptUpload from "../components/uploads/ReceiptUpload";
import BankStatementUpload from "../components/uploads/BankStatementUpload";

const UploadPage = () => {
  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Upload Documents
      </h1>
      <ReceiptUpload />
      <BankStatementUpload />
    </div>
  );
};

export default UploadPage;
