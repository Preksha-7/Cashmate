import React from "react";

const Loading = ({
  size = "md",
  text = "Loading...",
  fullScreen = false,
  inline = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <div
            className={`animate-spin rounded-full border-b-2 border-primary-600 mx-auto ${sizeClasses[size]}`}
          ></div>
          {text && (
            <p className={`mt-4 text-gray-600 ${textSizes[size]}`}>{text}</p>
          )}
        </div>
      </div>
    );
  }

  if (inline) {
    return (
      <div className="flex items-center space-x-2">
        <div
          className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]}`}
        ></div>
        {text && (
          <span className={`text-gray-600 ${textSizes[size]}`}>{text}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full border-b-2 border-primary-600 mx-auto ${sizeClasses[size]}`}
        ></div>
        {text && (
          <p className={`mt-4 text-gray-600 ${textSizes[size]}`}>{text}</p>
        )}
      </div>
    </div>
  );
};

// Specific loading components for common use cases
export const ButtonLoading = ({ text = "Processing..." }) => (
  <Loading size="sm" text={text} inline />
);

export const PageLoading = ({ text = "Loading page..." }) => (
  <Loading size="lg" text={text} fullScreen />
);

export const ContentLoading = ({ text = "Loading content..." }) => (
  <Loading size="md" text={text} />
);

export const TableLoading = () => (
  <div className="animate-pulse">
    <div className="space-y-3">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-4">
          <div className="h-4 bg-gray-200 rounded col-span-1"></div>
          <div className="h-4 bg-gray-200 rounded col-span-1"></div>
          <div className="h-4 bg-gray-200 rounded col-span-1"></div>
          <div className="h-4 bg-gray-200 rounded col-span-1"></div>
        </div>
      ))}
    </div>
  </div>
);

export const CardLoading = () => (
  <div className="animate-pulse">
    <div className="card p-6">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  </div>
);

export default Loading;
