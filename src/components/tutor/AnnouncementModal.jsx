import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

const AnnouncementModal = ({ isOpen, student, students = [], onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    announcementText: '',
    announcementType: 1,
    targetType: 1,
    targetStudentId: student?.studentProfileId || '',
    deadline: '',
    testSessionId: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed = name === 'announcementType' || name === 'targetType'
      ? Number(value)
      : value;
    setFormData((prev) => ({
      ...prev,
      [name]: parsed,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.title.length > 200) newErrors.title = 'Title must be 200 characters or less';
    if (!formData.announcementText.trim()) newErrors.announcementText = 'Message is required';
    if (formData.announcementText.length < 10) newErrors.announcementText = 'Message must be at least 10 characters';
    if (formData.announcementText.length > 1000) newErrors.announcementText = 'Message must be less than 1000 characters';
    if (formData.targetType === 2 && !formData.targetStudentId) {
      newErrors.targetStudentId = 'Please select a student';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      announcementText: '',
      announcementType: 1,
      targetType: 1,
      targetStudentId: student?.studentProfileId || '',
      deadline: '',
      testSessionId: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {student ? `Send Announcement to ${student.fullName}` : 'Create Announcement'}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Quiz Reminder"
                  maxLength="200"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Announcement Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Announcement Type *
                </label>
                <div className="space-y-2">
                  {[
                    { value: 1, label: '🧪 Quiz', description: 'Quiz or test announcement' },
                    { value: 2, label: '⏰ Deadline', description: 'Assignment or project deadline' },
                    { value: 3, label: '📝 Assignment', description: 'New assignment notification' },
                    { value: 4, label: '📢 General', description: 'General message' },
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="announcementType"
                        value={option.value}
                        checked={Number(formData.announcementType) === option.value}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-700">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message * ({formData.announcementText.length}/1000)
                </label>
                <textarea
                  name="announcementText"
                  value={formData.announcementText}
                  onChange={handleChange}
                  placeholder="Enter your announcement message..."
                  maxLength="1000"
                  rows="5"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.announcementText ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.announcementText && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.announcementText}
                  </p>
                )}
              </div>

              {/* Target Type (only show if not opening for specific student) */}
              {!student && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Send To *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="targetType"
                        value={1}
                        checked={Number(formData.targetType) === 1}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-700">All Students</div>
                        <div className="text-sm text-gray-500">Send to all your students</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="targetType"
                        value={2}
                        checked={Number(formData.targetType) === 2}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-700">Specific Student</div>
                        <div className="text-sm text-gray-500">Send to one student only</div>
                      </div>
                    </label>
                  </div>
                  {Number(formData.targetType) === 2 ? (
                    <motion.div layout className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select student *</label>
                      <select
                        name="targetStudentId"
                        value={formData.targetStudentId}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg ${errors.targetStudentId ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Choose a student</option>
                        {students.map((s) => (
                          <option key={s.studentProfileId} value={s.studentProfileId}>
                            {s.fullName || s.name || s.email || s.studentProfileId}
                          </option>
                        ))}
                      </select>
                      {errors.targetStudentId ? (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.targetStudentId}
                        </p>
                      ) : null}
                    </motion.div>
                  ) : null}
                </div>
              )}

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deadline */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deadline (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Test Session ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Test Session ID (optional)
                  </label>
                  <input
                    type="text"
                    name="testSessionId"
                    value={formData.testSessionId}
                    onChange={handleChange}
                    placeholder="UUID of related test session"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    'Send Announcement'
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementModal;
