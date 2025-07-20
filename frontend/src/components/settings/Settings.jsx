import React, { useState, useEffect } from "react";

const Settings = () => {
  const [formData, setFormData] = useState({
    name: "User Name", // Default values
    age: "30",
    email: "user.email@example.com",
    phoneNumber: "123-456-7890",
    profilePic: "", // This will store the file name or a base64 string
    job: "Software Engineer",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Load data from local storage on component mount
  useEffect(() => {
    const savedProfileData = localStorage.getItem("userProfile");
    if (savedProfileData) {
      setFormData(JSON.parse(savedProfileData));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      // For profile picture, typically you'd upload it and store its URL.
      // For this example, we'll store a dummy URL or file name.
      setFormData((prevData) => ({
        ...prevData,
        [name]: files[0] ? URL.createObjectURL(files[0]) : "", // Use URL.createObjectURL for a preview
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("userProfile", JSON.stringify(formData));
    console.log("Profile Data Saved:", formData);
    setIsEditing(false); // Switch back to display mode after saving
    alert("Profile settings saved successfully!");
  };

  const handleCancel = () => {
    // Reload original data from local storage or reset to initial state
    const savedProfileData = localStorage.getItem("userProfile");
    if (savedProfileData) {
      setFormData(JSON.parse(savedProfileData));
    } else {
      setFormData({
        name: "User Name",
        age: "30",
        email: "user.email@example.com",
        phoneNumber: "123-456-7890",
        profilePic: "",
        job: "Software Engineer",
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        Profile Settings
      </h2>

      {!isEditing ? (
        // Display Mode
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
            {formData.profilePic ? (
              <img
                src={formData.profilePic}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl text-gray-500 dark:text-gray-400">
                {formData.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {formData.name}
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Age:</span> {formData.age}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Email:</span> {formData.email}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Phone:</span> {formData.phoneNumber}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Job:</span> {formData.job}
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      ) : (
        // Edit Mode
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label
              htmlFor="age"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Age
            </label>
            <input
              type="number"
              name="age"
              id="age"
              value={formData.age}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Your Age"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Phone Number
            </label>
            <input
              type="tel"
              name="phoneNumber"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., +1234567890"
            />
          </div>

          <div>
            <label
              htmlFor="profilePic"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Profile Picture
            </label>
            <input
              type="file"
              name="profilePic"
              id="profilePic"
              accept="image/*"
              onChange={handleChange}
              className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
            />
            {formData.profilePic && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Selected file: {formData.profilePic.name || "Already uploaded"}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="job"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Job
            </label>
            <input
              type="text"
              name="job"
              id="job"
              value={formData.job}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Your Job Title"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Settings;
