import React from "react";
import ReceiptUpload from "../components/uploads/ReceiptUpload";
import BankStatementUpload from "../components/uploads/BankStatementUpload";

const UploadPage = () => {
  return (
    <div className="p-4 space-y-4">
      <ReceiptUpload />
      <BankStatementUpload />
    </div>
  );
};

export default UploadPage;
