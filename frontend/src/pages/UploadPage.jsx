import React from "react";
import ReceiptUpload from "../components/uploads/ReceiptUpload";

const UploadPage = () => {
  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h1>
      <ReceiptUpload />
    </div>
  );
};

export default UploadPage;
